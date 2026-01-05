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

## **弱指针**（Weak Pointers）

引用计数在表示内存中由多个对象组成的结构时非常有用。例如，树结构中的每个节点可以包含一个指向其每个子节点的 `Arc`。这样，当一个节点被丢弃时，不再使用的子节点也都会（递归地）被丢弃。

然而，这对于循环结构来说会出问题。如果子节点也包含一个指向其父节点的 `Arc`，那么两者都不会被丢弃，因为总是至少有一个 `Arc` 仍在引用它。

标准库的 `Arc` 附带了该问题的解决方案：`Weak<T>`。`Weak<T>`，也称为弱指针，行为有点像 `Arc<T>`，但不会阻止对象被丢弃。一个 `T` 可以在多个 `Arc<T>` 和 `Weak<T>` 对象之间共享，但当所有 `Arc<T>` 对象都消失时，`T` 会被丢弃，无论是否还有任何 `Weak<T>` 对象留下。

这意味着 `Weak<T>` 可以在没有 `T` 的情况下存在，因此不能像 `Arc<T>` 那样无条件地提供 `&T`。然而，为了通过 `Weak<T>` 访问 `T`，可以通过其 `upgrade()` 方法将其升级为 `Arc<T>`。此方法返回一个 `Option<Arc<T>>`，如果 `T` 已被丢弃则返回 `None`。

在基于 `Arc` 的结构中，`Weak` 可用于打破循环。例如，树结构中的子节点可以为父节点使用 `Weak` 而不是 `Arc`。这样，父节点的丢弃就不会因其子节点的存在而被阻止。

让我们来实现这个。

和之前一样，当 `Arc` 对象的数量达到零时，我们可以丢弃包含的 `T` 对象。然而，我们还不能丢弃和释放 `ArcData`，因为可能仍有弱指针引用它。只有当最后一个 `Weak` 指针也消失后，我们才能丢弃和释放 `ArcData`。

因此，我们将使用两个计数器：一个用于“引用 `T` 的事物数量”，另一个用于“引用 `ArcData<T>` 的事物数量”。换句话说，第一个计数器与之前相同：它计数 `Arc` 对象，而第二个计数器同时计数 `Arc` 和 `Weak` 对象。

我们还需要一些东西，允许我们在弱指针仍在使用 `ArcData<T>` 时丢弃包含的对象（`T`）。我们将使用一个 `Option<T>`，这样当数据被丢弃时我们可以使用 `None`，并将其包装在 `UnsafeCell` 中用于内部可变性（[“内部可变性”](chapter1#内部可变性interior-mutability)），以允许在 `ArcData<T>` 不被独占拥有时发生这种情况：
```rust
struct ArcData<T> {
    /// `Arc` 的数量。
    data_ref_count: AtomicUsize,
    /// `Arc` 和 `Weak` 的总数。
    alloc_ref_count: AtomicUsize,
    /// 数据。如果只剩下弱指针，则为 `None`。
    data: UnsafeCell<Option<T>>,
}
```
如果我们将 `Weak<T>` 视为一个负责保持 `ArcData<T>` 存活的对象，那么将 `Arc<T>` 实现为一个包含 `Weak<T>` 的结构体是有意义的，因为 `Arc<T>` 需要做同样的事情，甚至更多。

```rust
pub struct Arc<T> {
    weak: Weak<T>,
}

pub struct Weak<T> {
    ptr: NonNull<ArcData<T>>,
}

unsafe impl<T: Sync + Send> Send for Weak<T> {}
unsafe impl<T: Sync + Send> Sync for Weak<T> {}
```
`new` 函数与之前基本相同，只是现在需要同时初始化两个计数器：
```rust
impl<T> Arc<T> {
    pub fn new(data: T) -> Arc<T> {
        Arc {
            weak: Weak {
                ptr: NonNull::from(Box::leak(Box::new(ArcData {
                    alloc_ref_count: AtomicUsize::new(1),
                    data_ref_count: AtomicUsize::new(1),
                    data: UnsafeCell::new(Some(data)),
                }))),
            },
        }
    }
    // …
}
```
和之前一样，我们假设 `ptr` 字段始终指向一个有效的 `ArcData<T>`。这次，我们将这个假设编码为 `Weak<T>` 上的一个私有辅助方法 `data()`：
```rust
impl<T> Weak<T> {
    fn data(&self) -> &ArcData<T> {
        unsafe { self.ptr.as_ref() }
    }
    // …
}
```
在 `Arc<T>` 的 `Deref` 实现中，我们现在必须使用 `UnsafeCell::get()` 来获取指向单元格内容的指针，并使用不安全的代码来承诺此时它可以安全地共享。我们还需要 `as_ref().unwrap()` 来获取 `Option<T>` 中的引用。我们不必担心这会 panic，因为只有当没有 `Arc` 对象剩下时，`Option` 才会是 `None`。
```rust
impl<T> Deref for Arc<T> {
    type Target = T;

    fn deref(&self) -> &T {
        let ptr = self.weak.data().data.get();
        // 安全性：由于存在指向数据的 Arc，数据存在且可以共享。
        unsafe { (*ptr).as_ref().unwrap() }
    }
}
```
`Weak<T>` 的 `Clone` 实现非常简单；它几乎与我们之前 `Arc<T>` 的 `Clone` 实现相同：
```rust
impl<T> Clone for Weak<T> {
    fn clone(&self) -> Self {
        if self.data().alloc_ref_count.fetch_add(1, Relaxed) > usize::MAX / 2 {
            std::process::abort();
        }
        Weak { ptr: self.ptr }
    }
}
```
在我们新的 `Arc<T>` 的 `Clone` 实现中，我们需要增加两个计数器。我们将简单地使用 `self.weak.clone()` 来复用上述代码增加第一个计数器，因此我们只需要手动增加第二个计数器：
```rust
impl<T> Clone for Arc<T> {
    fn clone(&self) -> Self {
        let weak = self.weak.clone();
        if weak.data().data_ref_count.fetch_add(1, Relaxed) > usize::MAX / 2 {
            std::process::abort();
        }
        Arc { weak }
    }
}
```
丢弃 `Weak` 应该减少其计数器，并在计数器从一变为零时丢弃并释放 `ArcData`。这与我们之前 `Arc` 的 `Drop` 实现相同。
```rust
impl<T> Drop for Weak<T> {
    fn drop(&mut self) {
        if self.data().alloc_ref_count.fetch_sub(1, Release) == 1 {
            fence(Acquire);
            unsafe {
                drop(Box::from_raw(self.ptr.as_ptr()));
            }
        }
    }
}
```
丢弃 `Arc` 应该减少两个计数器。注意，其中一个已经自动处理了，因为每个 `Arc` 都包含一个 `Weak`，因此丢弃 `Arc` 也会导致丢弃一个 `Weak`。我们只需要处理另一个计数器：
```rust
impl<T> Drop for Arc<T> {
    fn drop(&mut self) {
        if self.weak.data().data_ref_count.fetch_sub(1, Release) == 1 {
            fence(Acquire);
            let ptr = self.weak.data().data.get();
            // 安全性：数据引用计数器为零，所以不会有任何东西访问它。
            unsafe {
                (*ptr) = None;
            }
        }
    }
}
```
> 在 Rust 中丢弃一个对象会首先运行其 `Drop::drop` 函数（如果它实现了 `Drop`），然后递归地逐一丢弃其所有字段。

`get_mut` 方法中的检查大部分保持不变，只是现在需要考虑弱指针。在检查独占性时忽略弱指针可能看似可行，但 `Weak<T>` 可以随时升级为 `Arc<T>`。因此，`get_mut` 在可以提供 `&mut T` 之前必须检查没有其他 `Arc<T>` 或 `Weak<T>` 指针：
```rust
impl<T> Arc<T> {
    // …
    pub fn get_mut(arc: &mut Self) -> Option<&mut T> {
        if arc.weak.data().alloc_ref_count.load(Relaxed) == 1 {
            fence(Acquire);
            // 安全性：没有其他东西可以访问数据，因为只有一个 Arc，我们对其拥有独占访问权，并且没有弱指针。
            let arcdata = unsafe { arc.weak.ptr.as_mut() };
            let option = arcdata.data.get_mut();
            // 我们知道数据仍然可用，因为我们有一个指向它的 Arc，所以这不会 panic。
            let data = option.as_mut().unwrap();
            Some(data)
        } else {
            None
        }
    }
    // …
}
```
接下来：升级弱指针。只有当数据仍然存在时，才能将 `Weak` 升级为 `Arc`。如果只剩下弱指针，就没有剩余的数据可以通过 `Arc` 共享了。因此，我们需要增加 `Arc` 计数器，但只能在该计数器不为零时进行。我们将使用一个比较并交换循环（[“比较并交换操作”](chapter2#比较并交换操作-compare-and-exchange-operations)）来实现这一点。

和之前一样，增加引用计数器使用 relaxed 内存顺序是可以的。没有其他变量的操作需要严格在此原子操作之前或之后发生。
```rust
impl<T> Weak<T> {
    // …
    pub fn upgrade(&self) -> Option<Arc<T>> {
        let mut n = self.data().data_ref_count.load(Relaxed);
        loop {
            if n == 0 {
                return None;
            }
            assert!(n < usize::MAX);
            if let Err(e) = self.data()
                .data_ref_count
                .compare_exchange_weak(n, n + 1, Relaxed, Relaxed)
            {
                n = e;
                continue;
            }
            return Some(Arc { weak: self.clone() });
        }
    }
}
```
> 注意这次我们如何检查 `n < usize::MAX`，因为该断言会在我们修改 `data_ref_count` 之前 panic。

相反，从 `Arc<T>` 获取 `Weak<T>` 要简单得多：
```rust
impl<T> Arc<T> {
    // …
    pub fn downgrade(arc: &Self) -> Weak<T> {
        arc.weak.clone()
    }
}
```

### **测试**（Testing It）

为了快速测试我们的创作，我们将修改之前的单元测试以使用弱指针，并验证它们可以在预期时升级：
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

    // 创建一个带有两个弱指针的 Arc。
    let x = Arc::new(("hello", DetectDrop));
    let y = Arc::downgrade(&x);
    let z = Arc::downgrade(&x);

    let t = std::thread::spawn(move || {
        // 此时弱指针应该可以升级。
        let y = y.upgrade().unwrap();
        assert_eq!(y.0, "hello");
    });

    assert_eq!(x.0, "hello");
    t.join().unwrap();

    // 数据还不应该被丢弃，弱指针应该可以升级。
    assert_eq!(NUM_DROPS.load(Relaxed), 0);
    assert!(z.upgrade().is_some());

    drop(x);

    // 现在，数据应该被丢弃了，弱指针应该不再可以升级。
    assert_eq!(NUM_DROPS.load(Relaxed), 1);
    assert!(z.upgrade().is_none());
}
```
这段代码也编译并运行没有问题，这给我们留下了一个非常可用的手工制作的 `Arc` 实现。

## **优化**（Optimizing）

虽然弱指针可能有用，但 `Arc` 类型通常在没有弱指针的情况下使用。我们上一个实现的缺点是，现在克隆和丢弃一个 `Arc` 都需要分别进行两次原子操作，因为它们必须增加或减少两个计数器。这使得所有 `Arc` 用户都要为弱指针的成本“付费”，即使他们没有使用弱指针。

解决方案似乎是分别计数 `Arc<T>` 和 `Weak<T>` 指针，但这样我们就无法原子地检查两个计数器是否都为零。为了理解这为何是个问题，假设我们有一个线程执行以下恼人的函数：

```rust
fn annoying(mut arc: Arc<Something>) {
    loop {
        let weak = Arc::downgrade(&arc);
        drop(arc);
        println!("I have no Arc!"); // ①
        arc = weak.upgrade().unwrap();
        drop(weak);
        println!("I have no Weak!"); // ②
    }
}
```

这个线程不断降级和升级一个 `Arc`，使得它反复循环经过它不持有 `Arc` 的时刻（①），以及它不持有 `Weak` 的时刻（②）。如果我们检查两个计数器以查看是否有任何线程仍在使用分配，那么如果我们不幸地在第一次打印语句（①）期间检查 `Arc` 计数器，而在第二次打印语句（②）期间检查 `Weak` 计数器，这个线程可能能够隐藏它的存在。

在我们上一个实现中，我们通过将每个 `Arc` 也计为一个 `Weak` 来解决这个问题。一个更微妙的方式是将所有 `Arc` 指针合计为单个 `Weak` 指针。这样，只要至少有一个 `Arc` 对象存在，弱指针计数器（`alloc_ref_count`）就永远不会达到零，就像我们上一个实现一样，但克隆一个 `Arc` 完全不需要触及那个计数器。只有丢弃最后一个 `Arc` 才会同时减少弱指针计数器。

让我们尝试这个。

这次，我们不能简单地将 `Arc<T>` 实现为 `Weak<T>` 的包装器，所以两者都将包装一个指向分配的非空指针：

```rust
pub struct Arc<T> {
    ptr: NonNull<ArcData<T>>,
}
unsafe impl<T: Sync + Send> Send for Arc<T> {}
unsafe impl<T: Sync + Send> Sync for Arc<T> {}

pub struct Weak<T> {
    ptr: NonNull<ArcData<T>>,
}
unsafe impl<T: Sync + Send> Send for Weak<T> {}
unsafe impl<T: Sync + Send> Sync for Weak<T> {}
```

既然我们在优化实现，我们也可以使用 `std::mem::ManuallyDrop<T>` 而不是 `Option<T>` 来使 `ArcData<T>` 稍微小一些。我们使用 `Option<T>` 是为了在丢弃数据时能够将 `Some(T)` 替换为 `None`，但实际上我们不需要单独的 `None` 状态来告诉我们数据已消失，因为 `Arc<T>` 的存在或缺失已经告诉我们这一点。`ManuallyDrop<T>` 占用与 `T` 完全相同的空间，但允许我们通过不安全地调用 `ManuallyDrop::drop()` 在任何时候手动丢弃它：

```rust
use std::mem::ManuallyDrop;

struct ArcData<T> {
    /// `Arc` 的数量。
    data_ref_count: AtomicUsize,
    /// `Weak` 的数量，加上一如果存在任何 `Arc`。
    alloc_ref_count: AtomicUsize,
    /// 数据。如果只剩下弱指针，则被丢弃。
    data: UnsafeCell<ManuallyDrop<T>>,
}
```

`Arc::new` 函数几乎保持不变，像之前一样同时初始化两个计数器，但现在使用 `ManuallyDrop::new()` 而不是 `Some()`：

```rust
impl<T> Arc<T> {
    pub fn new(data: T) -> Arc<T> {
        Arc {
            ptr: NonNull::from(Box::leak(Box::new(ArcData {
                alloc_ref_count: AtomicUsize::new(1),
                data_ref_count: AtomicUsize::new(1),
                data: UnsafeCell::new(ManuallyDrop::new(data)),
            }))),
        }
    }
    // …
}
```

`Deref` 实现不能再利用 `Weak` 类型上的私有 `data` 方法，所以我们将在 `Arc<T>` 上添加相同的私有辅助函数：

```rust
impl<T> Arc<T> {
    // …
    fn data(&self) -> &ArcData<T> {
        unsafe { self.ptr.as_ref() }
    }
    // …
}

impl<T> Deref for Arc<T> {
    type Target = T;

    fn deref(&self) -> &T {
        // 安全性：由于存在指向数据的 Arc，数据存在且可以共享。
        unsafe { &*self.data().data.get() }
    }
}
```

`Weak<T>` 的 `Clone` 和 `Drop` 实现与我们上一个实现完全相同。为了完整起见，这里给出它们，包括私有的 `Weak::data` 辅助函数：

```rust
impl<T> Weak<T> {
    fn data(&self) -> &ArcData<T> {
        unsafe { self.ptr.as_ref() }
    }
    // …
}

impl<T> Clone for Weak<T> {
    fn clone(&self) -> Self {
        if self.data().alloc_ref_count.fetch_add(1, Relaxed) > usize::MAX / 2 {
            std::process::abort();
        }
        Weak { ptr: self.ptr }
    }
}

impl<T> Drop for Weak<T> {
    fn drop(&mut self) {
        if self.data().alloc_ref_count.fetch_sub(1, Release) == 1 {
            fence(Acquire);
            unsafe {
                drop(Box::from_raw(self.ptr.as_ptr()));
            }
        }
    }
}
```

现在我们到了这个新的优化实现的核心部分——克隆一个 `Arc<T>` 现在只需要触及一个计数器：

```rust
impl<T> Clone for Arc<T> {
    fn clone(&self) -> Self {
        if self.data().data_ref_count.fetch_add(1, Relaxed) > usize::MAX / 2 {
            std::process::abort();
        }
        Arc { ptr: self.ptr }
    }
}
```

类似地，丢弃一个 `Arc<T>` 现在只需要减少一个计数器，除了看到该计数器从一变为零的最后一次丢弃。在那种情况下，弱指针计数器也需要减少，以便在没有任何弱指针剩下时可以达到零。我们通过简单地凭空创建一个 `Weak<T>` 并立即丢弃它来实现：

```rust
impl<T> Drop for Arc<T> {
    fn drop(&mut self) {
        if self.data().data_ref_count.fetch_sub(1, Release) == 1 {
            fence(Acquire);
            // 安全性：数据引用计数器为零，所以不会有任何东西再访问数据。
            unsafe {
                ManuallyDrop::drop(&mut *self.data().data.get());
            }
            // 现在没有 `Arc<T>` 剩下了，丢弃代表所有 `Arc<T>` 的隐式弱指针。
            drop(Weak { ptr: self.ptr });
        }
    }
}
```

`Weak<T>` 上的 `upgrade` 方法大部分保持不变，只是它不再克隆弱指针，因为它不再需要增加弱指针计数器。只有在分配已经至少有一个 `Arc<T>` 时，升级才会成功，这意味着 `Arc` 已经被计入弱指针计数器。

```rust
impl<T> Weak<T> {
    // …
    pub fn upgrade(&self) -> Option<Arc<T>> {
        let mut n = self.data().data_ref_count.load(Relaxed);
        loop {
            if n == 0 {
                return None;
            }
            assert!(n < usize::MAX);
            if let Err(e) = self.data()
                .data_ref_count
                .compare_exchange_weak(n, n + 1, Relaxed, Relaxed)
            {
                n = e;
                continue;
            }
            return Some(Arc { ptr: self.ptr });
        }
    }
}
```

到目前为止，这个实现与我们先前的实现差异非常小。然而，变得棘手的是我们还需要实现的最后两个方法：`downgrade` 和 `get_mut`。

与之前不同，`get_mut` 方法现在需要检查两个计数器是否都设置为一，以便能够确定是否只有一个 `Arc<T>` 且没有 `Weak<T>` 剩下，因为现在弱指针计数器为一可以代表多个 `Arc<T>` 指针。读取计数器是两个在不同（略微）时间发生的独立操作，所以我们必须非常小心不要错过任何并发的降级，例如我们在[“优化”](chapter6#优化optimizing)开头看到的示例情况。

如果我们首先检查 `data_ref_count` 是否为一，那么我们可能会在检查另一个计数器之前错过随后的 `upgrade()`。但是，如果我们首先检查 `alloc_ref_count` 是否为一，那么我们可能会在检查另一个计数器之前错过随后的 `downgrade()`。

摆脱这个困境的一种方法是，通过“锁定”弱指针计数器来短暂地阻塞 `downgrade()` 操作。为此，我们不需要像互斥锁那样的东西。我们可以使用一个特殊值，比如 `usize::MAX`，来表示弱指针计数器的一个特殊“锁定”状态。它只会被锁定非常短的时间，只是为了加载另一个计数器，所以 `downgrade` 方法可以自旋直到它解锁，在不太可能的情况下它与 `get_mut` 同时运行。

所以，在 `get_mut` 中，我们首先必须检查 `alloc_ref_count` 是否为一，同时如果是，则将其替换为 `usize::MAX`。这是 `compare_exchange` 的工作。

然后我们必须检查另一个计数器是否也为一，之后我们可以立即解锁弱指针计数器。如果第二个计数器也为一，我们知道我们对分配和数据拥有独占访问权，这样我们就可以返回一个 `&mut T`。

```rust
pub fn get_mut(arc: &mut Self) -> Option<&mut T> {
    // Acquire 匹配 Weak::drop 的 Release 减少，以确保任何升级的指针在下一个 data_ref_count.load 中可见。
    if arc.data().alloc_ref_count.compare_exchange(
        1, usize::MAX, Acquire, Relaxed
    ).is_err() {
        return None;
    }

    let is_unique = arc.data().data_ref_count.load(Relaxed) == 1;

    // Release 匹配 `downgrade` 中的 Acquire 增加，以确保 `downgrade` 之后对 data_ref_count 的任何更改不会改变上面的 is_unique 结果。
    arc.data().alloc_ref_count.store(1, Release);

    if !is_unique {
        return None;
    }

    // Acquire 以匹配 Arc::drop 的 Release 减少，以确保没有其他东西在访问数据。
    fence(Acquire);
    unsafe { Some(&mut *arc.data().data.get()) }
}
```

正如你可能已经预料到的，锁定操作（`compare_exchange`）必须使用 Acquire 内存顺序，解锁操作（`store`）必须使用 Release 内存顺序。

如果我们在 `compare_exchange` 中使用了 Relaxed，那么即使 `compare_exchange` 已经确认每个 `Weak` 指针都被丢弃了，后续的 `data_ref_count` 加载也可能看不到新升级的 `Weak` 指针的新值。

如果我们在 `store` 中使用了 Relaxed，那么前面的加载可能会观察到未来仍可降级的 `Arc` 的 `Arc::drop` 的结果。

acquire 栅栏和之前一样：它与 `Arc::Drop` 中的 release-decrement 操作同步，以确保通过先前的 `Arc` 克隆的每个访问都在新的独占访问之前发生。

拼图的最后一块是 `downgrade` 方法，它必须检查特殊的 `usize::MAX` 值以查看弱指针计数器是否被锁定，并自旋直到它被解锁。就像在 `upgrade` 实现中一样，我们将使用一个比较并交换循环来检查特殊值和溢出，然后再增加计数器：

```rust
pub fn downgrade(arc: &Self) -> Weak<T> {
    let mut n = arc.data().alloc_ref_count.load(Relaxed);
    loop {
        if n == usize::MAX {
            std::hint::spin_loop();
            n = arc.data().alloc_ref_count.load(Relaxed);
            continue;
        }
        assert!(n < usize::MAX - 1);
        // Acquire 与 get_mut 中的 release-store 同步。
        if let Err(e) =
            arc.data()
                .alloc_ref_count
                .compare_exchange_weak(n, n + 1, Acquire, Relaxed)
        {
            n = e;
            continue;
        }
        return Weak { ptr: arc.ptr };
    }
}
```

我们对 `compare_exchange_weak` 使用 acquire 内存顺序，它与 `get_mut` 函数中的 release-store 同步。否则，后续 `Arc::drop` 的效果可能在解锁计数器之前就对运行 `get_mut` 的线程可见。

换句话说，这里的 acquire 比较并交换操作有效地“锁定”了 `get_mut`，阻止其成功。它可以通过稍后使用 release 内存顺序将计数器减少回一的 `Weak::drop` 再次“解锁”。

我们刚刚制作的 `Arc<T>` 和 `Weak<T>` 的优化实现几乎与 Rust 标准库中包含的实现相同。

如果我们运行与之前完全相同的测试（[“测试”](chapter6#测试testing-it-1)），我们会看到这个优化实现也能编译并通过我们的测试。

如果你觉得为这个优化实现正确决定内存顺序很困难，别担心。许多并发数据结构的正确实现比这个更简单。本章包含这个 `Arc` 实现，正是因为它关于内存顺序的微妙之处。

## **总结**（Summary）

- `Arc<T>` 提供了引用计数分配的共享所有权。
- 通过检查引用计数器是否恰好为一，`Arc<T>` 可以有条件地提供独占访问（`&mut T`）。
- 增加原子引用计数器可以使用 relaxed 操作，但最后的减少必须与所有先前的减少同步。
- 弱指针（`Weak<T>`）可用于避免循环。
- `NonNull<T>` 类型表示一个永远不为空的指向 `T` 的指针。
- `ManuallyDrop<T>` 类型可用于通过不安全代码手动决定何时丢弃 `T`。
- 一旦涉及多个原子变量，事情就变得更加复杂。
- 实现一个临时（自旋）锁有时可以成为同时操作多个原子变量的有效策略。
