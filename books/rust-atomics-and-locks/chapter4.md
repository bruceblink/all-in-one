---
sidebar_position: 7
typora-root-url: ./..\..\static
---

# 第 4 章 构建我们自己的自旋锁（Building Our Own Spin Lock）

锁住一个常规的互斥锁（参见[“加锁：互斥锁和读写锁”](chapter1#加锁mutex-与-rwlocklocking-mutexes-and-rwlocks)）在互斥锁已被锁定时会导致你的线程进入睡眠状态。这避免了在等待锁释放时浪费资源。但是，如果一个锁只会被持有非常短暂的时间，并且锁定它的线程可以在不同的处理器核心上并行运行，那么让线程反复尝试去锁定它而不真正进入睡眠状态可能更好。

**自旋锁**正是这样的一种互斥锁。尝试锁定一个已经锁定的互斥锁将导致忙循环或自旋：反复尝试直到最终成功。这可能会浪费处理器周期，但在锁定时有时能带来更低的延迟。

> 许多现实世界中的互斥锁实现，包括某些平台上的 `std::sync::Mutex`，在请求操作系统让线程睡眠之前，会短暂地表现得像一个自旋锁。这是尝试结合两者的优点，尽管这种行为是否有益完全取决于具体的使用场景。

在本章中，我们将构建自己的 `SpinLock` 类型，应用我们在第2章和第3章中学到的知识，并看看如何利用 Rust 的类型系统为我们的 `SpinLock` 用户提供一个安全且有用的接口。

## **一个最小的实现**（A Minimal Implementation）

让我们从头开始实现这样一个自旋锁。

最精简的版本非常简单，如下所示：
```rust
pub struct SpinLock {
    locked: AtomicBool,
}
```
我们只需要一个布尔值来指示它是否被锁定。我们使用原子布尔值，因为我们希望多个线程能够同时与其交互。

然后我们只需要一个构造函数，以及 `lock` 和 `unlock` 方法：
```rust
impl SpinLock {
    pub const fn new() -> Self {
        Self { locked: AtomicBool::new(false) }
    }

    pub fn lock(&self) {
        while self.locked.swap(true, Acquire) {
            std::hint::spin_loop();
        }
    }

    pub fn unlock(&self) {
        self.locked.store(false, Release);
    }
}
```
锁定的布尔值初始为 `false`，`lock` 方法将其交换为 `true` 并在它已经是 `true` 时持续尝试，而 `unlock` 方法只是将其设回 `false`。

> 我们也可以使用比较并交换操作来原子性地检查布尔值是否为 `false` 并在是的情况下将其设为 `true`，而不是使用交换操作：
>
> ​    `self.locked.compare_exchange_weak(false, true, Acquire, Relaxed).is_ok()`
>
> 虽然更冗长一些，但根据你的偏好，这可能更容易理解，因为它更清晰地捕捉了操作可能失败或成功这一概念。然而，这也可能导致略有不同的指令，我们将在第7章看到。

在 `while` 循环中，我们使用了自旋循环提示，它告诉处理器我们正在自旋等待某些变化。在大多数主要平台上，此提示会导致一条特殊指令，使处理器核心为此类情况优化其行为。例如，它可能会暂时减慢速度或优先处理其他有用的事情。然而，与 `thread::sleep` 或 `thread::park` 等阻塞操作不同，自旋循环提示并不会导致操作系统被调用来让你的线程进入睡眠以让位给另一个线程。

> 通常，在自旋循环中包含这样的提示是个好主意。根据具体情况，甚至在再次尝试访问原子变量之前多次执行此提示可能也是有益的。如果你关心最后几纳秒的性能并想找到最优策略，你必须对你特定的使用场景进行基准测试。不幸的是，正如我们将在第7章看到的那样，此类基准测试的结论可能高度依赖于硬件。

我们使用获取和释放内存排序来确保每次 `unlock()` 调用与后续的 `lock()` 调用之间建立起一个“发生在之前”关系。换句话说，确保在锁定之后，我们可以安全地假设在上次被锁定期间发生的任何事情都已经发生了。这是获取和释放排序最经典的用例：获取和释放一个锁。

图4-1 展示了我们的 `SpinLock` 被用来保护对某些共享数据的访问，且有两个线程并发尝试获取锁的情况。请注意第一个线程上的 `unlock` 操作如何与第二个线程上的 `lock` 操作形成“发生在之前”关系，这确保了线程无法并发访问数据。

![figure-4-1](/img/rust-atomics-and-locks/chapter4/figure-4-1.png)

**图4-1. 两个线程使用我们的 `SpinLock` 保护对某些共享数据的访问时，它们之间的“发生在之前”关系**

## **一个不安全的自旋锁**（An Unsafe Spin Lock）

我们上面的 `SpinLock` 类型有一个完全安全的接口，因为就其本身而言，即使被误用也不会导致任何未定义行为。然而，在大多数使用情况下，它将被用来保护对共享变量的修改，这意味着用户仍然必须使用不安全、未经检查的代码。

为了提供更简单的接口，我们可以更改 `lock` 方法，使其返回一个对锁保护数据的独占引用（`&mut T`），因为在大多数使用情况下，正是锁定操作保证了可以安全地假设独占访问。

为了能够做到这一点，我们必须更改类型，使其对保护的数据类型泛型化，并添加一个字段来保存该数据。由于自旋锁本身是共享的，但数据可以被修改（或独占访问），我们需要使用内部可变性（参见[“内部可变性”](chapter1#内部可变性interior-mutability)），为此我们将使用 `UnsafeCell`：

```rust
use std::cell::UnsafeCell;

pub struct SpinLock<T> {
    locked: AtomicBool,
    value: UnsafeCell<T>,
}
```

作为一种预防措施，`UnsafeCell` 没有实现 `Sync`，这意味着我们的类型现在不能再在线程间共享，这使其相当无用。为了解决这个问题，我们需要向编译器承诺，我们的类型实际上在线程间共享是安全的。然而，由于锁可用于将类型为 `T` 的值从一个线程发送到另一个线程，我们必须将此承诺限制为在线程间安全发送的类型。因此，我们（不安全地）为所有实现了 `Send` 的 `T` 实现 `SpinLock<T>` 的 `Sync`，像这样：

```rust
unsafe impl<T> Sync for SpinLock<T> where T: Send {}
```

注意，我们不需要要求 `T` 是 `Sync`，因为我们的 `SpinLock<T>` 一次只允许一个线程访问它保护的 `T`。只有当我们允许多个线程同时访问时，比如读写锁对读者所做的那样，我们（另外）才需要要求 `T: Sync`。

接下来，我们的 `new` 函数现在需要接受一个类型为 `T` 的值来初始化 `UnsafeCell`：

```rust
impl<T> SpinLock<T> {
    pub const fn new(value: T) -> Self {
        Self {
            locked: AtomicBool::new(false),
            value: UnsafeCell::new(value),
        }
    }
    // ...
}
```

然后我们到了有趣的部分：`lock` 和 `unlock`。我们做这一切的原因是为了能够从 `lock()` 返回一个 `&mut T`，这样用户在使用我们的锁保护他们的数据时就不需要编写不安全的、未经检查的代码。这意味着我们现在必须在 `lock` 的实现中使用不安全代码。`UnsafeCell` 可以通过其 `get()` 方法给我们一个指向其内容的原始指针（`*mut T`），我们可以在不安全块中将其转换为引用，如下所示：

```rust
pub fn lock(&self) -> &mut T {
    while self.locked.swap(true, Acquire) {
        std::hint::spin_loop();
    }
    unsafe { &mut *self.value.get() }
}
```

由于 `lock` 的函数签名在其输入和输出中都包含引用，`&self` 和 `&mut T` 的生命周期已被省略并假定为相同。（参见Rust书第10章“泛型类型、特性和生命周期”中的“生命周期省略”。）我们可以通过手动写出生命周期来使其明确，像这样：

```rust
pub fn lock<'a>(&'a self) -> &'a mut T { ... }
```

这清楚地表明返回引用的生命周期与 `&self` 的生命周期相同。这意味着我们声称返回的引用只要锁本身存在就有效。

如果我们假装 `unlock()` 不存在，这将是一个完美安全且合理的接口。`SpinLock` 可以被锁定，得到一个 `&mut T`，然后永远不会再被锁定，这保证了独占引用确实是独占的。

然而，如果我们尝试将 `unlock()` 方法加回来，我们需要一种方法来限制返回引用的生命周期，直到下一次调用 `unlock()`。如果编译器能理解英语，也许这样是可行的：

```rust
pub fn lock<'a>(&self) -> &'a mut T where
    'a 在下次对 self 调用 unlock() 时结束，
    即使该调用是由另一个线程执行的。
    哦，当然，当 self 被丢弃时它也会结束。
    （谢谢！）
{ ... }
```

不幸的是，这不是有效的Rust。我们无法向编译器解释这个限制，只能向用户解释。为了将责任转移给用户，我们将 `unlock` 函数标记为不安全，并留下注释说明他们需要做什么来保持安全性：

```rust
/// 安全性：来自 lock() 的 &mut T 必须已经消失！
/// （不要作弊，比如保留对那个 T 的字段的引用！）
pub unsafe fn unlock(&self) {
    self.locked.store(false, Release);
}
```

## **使用锁守卫的安全接口**（A Safe Interface Using a Lock Guard）

为了提供一个完全安全的接口，我们需要将解锁操作与 `&mut T` 的结束绑定。我们可以通过将这个引用包装在我们自己的类型中来实现，这个类型表现得像引用，但也实现了 `Drop` 特性，以便在丢弃时执行某些操作。

这种类型通常被称为守卫，因为它有效地保护着锁的状态，并负责该状态直到被丢弃。

我们的 `Guard` 类型将简单地包含一个对 `SpinLock` 的引用，这样它既可以访问其 `UnsafeCell`，又可以在之后重置 `AtomicBool`：

```rust
pub struct Guard<T> {
    lock: &SpinLock<T>,
}
```

然而，如果我们尝试编译这个，编译器会告诉我们：

```
error[E0106]: missing lifetime specifier
--> src/lib.rs
|
|     lock: &SpinLock<T>,
|           ^ expected named lifetime parameter
|
help: consider introducing a named lifetime parameter
|
| pub struct Guard<'a, T> {
|               ^^^
|     lock: &'a SpinLock<T>,
|           ^^
```

显然，这不是可以省略生命周期的地方。我们必须明确指出引用有有限的生命周期，正如编译器建议的那样：

```rust
pub struct Guard<'a, T> {
    lock: &'a SpinLock<T>,
}
```

这保证了 `Guard` 不会比 `SpinLock` 存活得更久。

接下来，我们更改 `SpinLock` 上的 `lock` 方法以返回一个 `Guard`：

```rust
pub fn lock(&self) -> Guard<T> {
    while self.locked.swap(true, Acquire) {
        std::hint::spin_loop();
    }
    Guard { lock: self }
}
```

我们的 `Guard` 类型没有构造函数且其字段是私有的，因此这是用户获得 `Guard` 的唯一方式。因此，我们可以安全地假设 `Guard` 的存在意味着 `SpinLock` 已被锁定。

为了使 `Guard<T>` 表现得像一个（独占）引用，透明地提供对 `T` 的访问，我们必须如下实现特殊的 `Deref` 和 `DerefMut` 特性：

```rust
use std::ops::{Deref, DerefMut};

impl<T> Deref for Guard<'_, T> {
    type Target = T;
    
    fn deref(&self) -> &T {
        // 安全性：此 Guard 的存在本身
        // 就保证我们已经独占地锁定了锁。
        unsafe { &*self.lock.value.get() }
    }
}

impl<T> DerefMut for Guard<'_, T> {
    fn deref_mut(&mut self) -> &mut T {
        // 安全性：此 Guard 的存在本身
        // 就保证我们已经独占地锁定了锁。
        unsafe { &mut *self.lock.value.get() }
    }
}
```

作为最后一步，我们为 `Guard` 实现 `Drop`，从而可以完全移除不安全的 `unlock` 方法：

```rust
impl<T> Drop for Guard<'_, T> {
    fn drop(&mut self) {
        self.lock.locked.store(false, Release);
    }
}
```

就这样，通过 `Drop` 和 Rust 类型系统的魔法，我们为 `SpinLock` 类型提供了一个完全安全（且有用）的接口。

让我们试试看：

```rust
fn main() {
    let x = SpinLock::new(Vec::new());
    thread::scope(|s| {
        s.spawn(|| x.lock().push(1));
        s.spawn(|| {
            let mut g = x.lock();
            g.push(2);
            g.push(2);
        });
    });
    let g = x.lock();
    assert!(g.as_slice() == [1, 2, 2] || g.as_slice() == [2, 2, 1]);
}
```

上面的程序展示了我们的 `SpinLock` 是多么容易使用。得益于 `Deref` 和 `DerefMut`，我们可以直接在守卫上调用 `Vec::push` 方法。而得益于 `Drop`，我们不需要担心解锁。

通过调用 `drop(g)` 来丢弃守卫也可以显式解锁。如果你尝试过早解锁，你会通过编译器错误看到守卫在起作用。例如，如果你在两个 `push(2)` 行之间插入 `drop(g);`，第二个 `push` 将无法编译，因为此时你已经丢弃了 `g`：

```
error[E0382]: borrow of moved value: `g`
--> src/lib.rs
|
|     drop(g);
|          - value moved here
|     g.push(2);
|     ^^^^^^^^^ value borrowed here after move
```

得益于 Rust 的类型系统，我们可以放心，这样的错误在运行程序之前就会被捕获。

## **总结**（Summary）

- 自旋锁是一种在等待时忙循环或自旋的互斥锁。
- 自旋可以减少延迟，但也可能浪费时钟周期并降低性能。
- 自旋循环提示 `std::hint::spin_loop()` 可用于告知处理器存在自旋循环，这可能会提高其效率。
- `SpinLock<T>` 可以仅用 `AtomicBool` 和 `UnsafeCell<T>` 实现，后者对于内部可变性是必需的（参见[“内部可变性”](chapter1#内部可变性interior-mutability)）。
- 解锁和锁定操作之间的"happens-before relationship"是防止数据竞争所必需的，否则会导致未定义行为。
- 获取和释放内存排序非常适合这种用例。
- 当为避免未定义行为而做出未经检查的假设时，可以通过使函数不安全将责任转移给调用者。
- `Deref` 和 `DerefMut` 特性可用于使类型表现得像引用一样，透明地提供对另一个对象的访问。
- `Drop` 特性可用于在对象被丢弃时执行某些操作，例如当其超出作用域时，或当其被传递给 `drop()` 时。
- 锁守卫是一种有用的设计模式，它是一种特殊类型，用于表示对已锁定锁的（安全）访问。由于 `Deref` 特性，这种类型通常表现得像引用，并通过 `Drop` 特性实现自动解锁。
