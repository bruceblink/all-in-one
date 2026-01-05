---
sidebar_position: 7
typora-root-url: ./..\..\static
---

# 第 6 章 构建我们自己的 “Arc”（Building Our Own “Arc”）

在[“引用计数”](chapter1#引用计数reference-counting)一节中，我们看到了 `std::sync::Arc<T>` 类型，它允许通过引用计数实现共享所有权。`Arc::new` 函数创建一个新的分配，就像 `Box::new` 一样。然而，与 `Box` 不同，克隆一个 `Arc` 会共享原始分配，而不会创建新的分配。只有当 `Arc` 及其所有克隆都被丢弃时，共享分配才会被丢弃。
实现这种类型所涉及的内存顺序考虑可能变得相当有趣。在本章中，我们将通过实现自己的 `Arc<T>` 来将更多理论付诸实践。我们将从一个基本版本开始，然后扩展它以支持循环结构的弱指针，并以一个与标准库中实现几乎相同的优化版本结束本章。

## **基本引用计数**（Basic Reference Counting）

我们的第一个版本将使用一个单一的 `AtomicUsize` 来计数共享分配的 `Arc` 对象的数量。让我们从一个保存此计数器以及 `T` 对象的结构体开始：
```rust
struct ArcData<T> {
    ref_count: AtomicUsize,
    data: T,
}
```
注意，这个结构体不是公开的。它是我们 `Arc` 实现的一个内部实现细节。

接下来是 `Arc<T>` 结构体本身，它实际上只是一个指向（共享的）`ArcData<T>` 对象的指针。

将其作为 `Box<ArcData<T>>` 的包装器可能很诱人，使用标准的 `Box` 来处理 `ArcData<T>` 的分配。然而，`Box` 代表独占所有权，而非共享所有权。我们也不能使用引用，因为我们不仅仅是在借用其他东西拥有的数据，并且其生命周期（“直到此 `Arc` 的最后一个克隆被丢弃”）无法直接用 Rust 的生命周期表示。
相反，我们将不得不诉诸于使用指针并手动处理分配和所有权的概念。我们将使用 `std::ptr::NonNull<T>`，它表示一个永远不为空的指向 `T` 的指针，而不是 `*mut T` 或 `*const T`。这样，`Option<Arc<T>>` 的大小将与 `Arc<T>` 相同，使用空指针表示 `None`。

```rust
use std::ptr::NonNull;

pub struct Arc<T> {
    ptr: NonNull<ArcData<T>>,
}
```
对于引用或 `Box`，编译器会自动理解对于哪些 `T`，它应该使你的结构体实现 `Send` 或 `Sync`。然而，当使用原始指针或 `NonNull` 时，它会保守地假设它永远不是 `Send` 或 `Sync`，除非我们明确告知它。
跨线程发送 `Arc<T>` 会导致 `T` 对象被共享，这要求 `T` 是 `Sync`。类似地，跨线程发送 `Arc<T>` 可能导致另一个线程丢弃那个 `T`，有效地将其转移到另一个线程，这要求 `T` 是 `Send`。换句话说，`Arc<T>` 应该是 `Send` 当且仅当 `T` 同时是 `Send` 和 `Sync`。对于 `Sync` 来说完全相同，因为共享的 `&Arc<T>` 可以被克隆成一个新的 `Arc<T>`。
```rust
unsafe impl<T: Send + Sync> Send for Arc<T> {}
unsafe impl<T: Send + Sync> Sync for Arc<T> {}
```
对于 `Arc<T>::new`，我们必须创建一个引用计数为一的 `ArcData<T>` 的新分配。我们将使用 `Box::new` 创建一个新分配，使用 `Box::leak` 放弃我们对此分配的独占所有权，并使用 `NonNull::from` 将其转换为指针：
```rust
impl<T> Arc<T> {
    pub fn new(data: T) -> Arc<T> {
        Arc {
            ptr: NonNull::from(Box::leak(Box::new(ArcData {
                ref_count: AtomicUsize::new(1),
                data,
            }))),
        }
    }
    // …
}
```
我们知道只要 `Arc` 对象存在，指针将始终指向一个有效的 `ArcData<T>`。然而，这不是编译器知道或为我们检查的事情，因此通过指针访问 `ArcData` 需要不安全的代码。我们将添加一个私有辅助函数来从 `Arc` 获取 `ArcData`，因为这是我们必须要做几次的事情：
```rust
fn data(&self) -> &ArcData<T> {
    unsafe { self.ptr.as_ref() }
}
```
使用它，我们现在可以实现 `Deref` 特性，使我们的 `Arc<T>` 透明地表现为对 `T` 的引用：
```rust
impl<T> Deref for Arc<T> {
    type Target = T;

    fn deref(&self) -> &T {
        &self.data().data
    }
}
```
注意，我们没有实现 `DerefMut`。因为 `Arc<T>` 代表共享所有权，我们不能无条件地提供 `&mut T`。

接下来：`Clone` 实现。克隆的 `Arc` 将使用相同的指针，在增加引用计数器之后：
```rust
impl<T> Clone for Arc<T> {
    fn clone(&self) -> Self {
        // TODO: 处理溢出。
        self.data().ref_count.fetch_add(1, Relaxed);
        Arc {
            ptr: self.ptr,
        }
    }
}
```
我们可以使用 Relaxed 内存顺序来增加引用计数器，因为没有其他变量的操作需要严格在此原子操作之前或之后发生。在此操作之前，我们已经可以访问包含的 `T`（通过原始的 `Arc`），之后这保持不变（但现在至少通过两个 `Arc` 对象）。

`Arc` 可能需要被克隆很多次，计数器才有可能溢出，但在循环中运行 `std::mem::forget(arc.clone())` 可以使其发生。我们可以使用[“示例：ID分配”](chapter2#示例id-分配-example-id-allocation)和[“示例：无溢出ID分配”](chapter2#示例无溢出的-id-分配-example-id-allocation-without-overflow)中讨论的任何技术来处理这个问题。

为了在正常（非溢出）情况下保持尽可能高的效率，我们将保留原始的 `fetch_add`，并且如果我们接近溢出到令人不适的程度，就直接中止整个进程：
```rust
if self.data().ref_count.fetch_add(1, Relaxed) > usize::MAX / 2 {
    std::process::abort();
}
```
> 中止进程不是瞬时的，会留下一些时间，在此期间另一个线程也可以调用 `Arc::clone`，进一步增加引用计数器。因此，仅仅检查 `usize::MAX - 1` 是不够的。然而，使用 `usize::MAX / 2` 作为限制是可以的：假设每个线程在内存中至少占用几个字节的空间，就不可能同时存在 `usize::MAX / 2` 个线程。

正如我们在克隆时增加计数器一样，我们需要在丢弃 `Arc` 时减少计数器。看到计数器从一变为零的线程知道它丢弃了最后一个 `Arc<T>`，并负责丢弃和释放 `ArcData<T>`。

我们将使用 `Box::from_raw` 回收分配的独占所有权，然后立即使用 `drop()` 丢弃它：
```rust
impl<T> Drop for Arc<T> {
    fn drop(&mut self) {
        // TODO: 内存顺序。
        if self.data().ref_count.fetch_sub(1, …) == 1 {
            unsafe {
                drop(Box::from_raw(self.ptr.as_ptr()));
            }
        }
    }
}
```
对于这个操作，我们不能使用 Relaxed 顺序，因为我们需要确保在丢弃数据时没有任何东西仍在访问它。换句话说，每一个先前的 `Arc` 克隆的丢弃操作都必须在最后一次丢弃之前发生。所以，最后的 `fetch_sub` 必须与每一个之前的 `fetch_sub` 操作建立 happens-before 关系，我们可以使用 release 和 acquire 顺序来实现：例如，将其从二减少到一有效地“释放”数据，而将其从一减少到零则“获取”其所有权。

我们可以使用 AcqRel 内存顺序来涵盖两种情况，但只有最终减少到零需要 Acquire，而其他情况只需要 Release。为了效率，我们将仅在 `fetch_sub` 操作上使用 Release，并仅在必要时使用单独的 Acquire 栅栏：
```rust
if self.data().ref_count.fetch_sub(1, Release) == 1 {
    fence(Acquire);
    unsafe {
        drop(Box::from_raw(self.ptr.as_ptr()));
    }
}
```

### **测试**（Testing It）

为了测试我们的 `Arc` 是否按预期运行，我们可以编写一个单元测试，创建一个包含特殊对象的 `Arc`，该对象让我们知道它何时被丢弃：
```rust
#[test]
fn test() {
    static NUM_DROPS: AtomicUsize = AtomicUsize::new(0);

    struct DetectDrop;
    impl Drop for DetectDrop {
        fn drop(&mut self) {
            NUM_DROPS.fetch_add(1, Relaxed);
        }
    }

    // 创建两个共享包含字符串和 DetectDrop 对象的 Arcs，以检测何时被丢弃。
    let x = Arc::new(("hello", DetectDrop));
    let y = x.clone();

    // 将 x 发送到另一个线程，并在那里使用它。
    let t = std::thread::spawn(move || {
        assert_eq!(x.0, "hello");
    });

    // 同时，y 在这里应该仍然可用。
    assert_eq!(y.0, "hello");

    // 等待线程完成。
    t.join().unwrap();

    // 一个 Arc，x，现在应该已经被丢弃了。
    // 我们还有 y，所以对象应该还没有被丢弃。
    assert_eq!(NUM_DROPS.load(Relaxed), 0);

    // 丢弃剩余的 `Arc`。
    drop(y);

    // 现在 `y` 也被丢弃了，对象应该已经被丢弃了。
    assert_eq!(NUM_DROPS.load(Relaxed), 1);
}
```
这段代码编译并运行正常，所以看起来我们的 `Arc` 行为符合预期！虽然这令人鼓舞，但并不能证明实现完全正确。建议使用涉及许多线程的长时间压力测试来获得更多信心。

> **Miri**
>
> 使用 Miri 运行测试也非常有用。Miri 是一个实验性但非常有用和强大的工具，用于检查不安全代码的各种未定义行为形式。Miri 是 Rust 编译器中层中间表示的解释器。这意味着它运行你的代码不是通过将其编译成本地处理器指令，而是在类型和生命周期等信息仍然可用的阶段解释它。因此，Miri 运行程序的速度比正常编译和运行慢得多，但能够检测许多会导致未定义行为的错误。它包含检测数据竞争的实验性支持，这使其能够检测内存顺序问题。有关如何使用 Miri 的更多详细信息和指南，请参见其 [GitHub](https://github.com/rust-lang/miri) 页面。

### **可变性**（Mutation）

如前所述，我们无法为我们的 `Arc` 实现 `DerefMut`。我们不能无条件地承诺对数据的独占访问（`&mut T`），因为它可能通过其他 `Arc` 对象被访问。

然而，我们可以做的是有条件地允许它。我们可以创建一个方法，仅在引用计数器为一时提供一个 `&mut T`，证明没有其他可以用于访问相同数据的 `Arc` 对象。

这个函数，我们称之为 `get_mut`，必须接受一个 `&mut Self` 以确保没有其他东西可以使用这个相同的 `Arc` 来访问 `T`。知道只有一个 `Arc` 是没有意义的，如果那个 `Arc` 仍然可以被共享的话。

我们需要使用 acquire 内存顺序来确保先前拥有 `Arc` 克隆的线程不再访问数据。我们需要与导致引用计数器变为一的每一个丢弃操作建立 happens-before 关系。

这仅在引用计数器确实为一时才重要；如果它更高，我们将不提供 `&mut T`，并且内存顺序无关紧要。所以，我们可以使用一个 relaxed 加载，后跟一个条件性的 acquire 栅栏，如下所示：
```rust
pub fn get_mut(arc: &mut Self) -> Option<&mut T> {
    if arc.data().ref_count.load(Relaxed) == 1 {
        fence(Acquire);
        // 安全性：没有其他东西可以访问数据，因为只有一个 Arc，并且我们对其拥有独占访问权。
        unsafe { Some(&mut arc.ptr.as_mut().data) }
    } else {
        None
    }
}
```
这个函数不接受 `self` 参数，而是接受一个常规参数（名为 `arc`）。这意味着它只能被调用为 `Arc::get_mut(&mut a)`，而不能作为 `a.get_mut()`。对于实现 `Deref` 的类型来说，这是可取的，以避免与底层 `T` 上类似名称的方法产生歧义。

返回的可变引用隐式地从参数借用生命周期，这意味着只要返回的 `&mut T` 还存在，就不能使用原始的 `Arc`，从而允许安全地改变。

当 `&mut T` 的生命周期结束时，`Arc` 可以再次被使用并与其他线程共享。有人可能想知道，我们是否需要担心之后访问数据的线程的内存顺序。然而，那是用于将 `Arc`（或其新克隆）与另一个线程共享的任何机制的责任。（例如，互斥锁、通道或生成新线程。）
