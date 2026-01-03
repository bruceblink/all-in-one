---
sidebar_position: 7
typora-root-url: ./..\..\static
---

# 第 5 章 构建我们自己的通道（Building Our Own Channels）

通道可用于在线程之间发送数据，它们有许多变体。有些通道只能用于恰好一个发送者和一个接收者，而其他通道可以允许任意数量的线程发送，甚至允许多个接收者。有些通道是阻塞的，这意味着接收（有时是发送）是一个阻塞操作，会使你的线程进入睡眠状态，直到操作可以完成。有些通道针对吞吐量进行了优化，而其他通道则针对低延迟进行了优化。

变化是无穷无尽的，没有一种适合所有用例的通用版本。

在本章中，我们将实现几个相对简单的通道，不仅探索原子操作的更多应用，而且了解更多关于如何用 Rust 的类型系统捕捉我们的需求和假设。

## **基于互斥锁的简单通道**（A Simple Mutex-Based Channel）

一个基本的通道实现不需要任何原子操作的知识。我们可以使用 `VecDeque`（基本上是一个允许在两端高效添加和删除元素的 `Vec`），并用 `Mutex` 保护它，允许多个线程访问。然后我们将 `VecDeque` 用作已发送但尚未接收的数据队列，这些数据通常称为消息。任何想要发送消息的线程只需将其添加到队列的末尾，任何想要接收消息的线程只需从队列的前端移除一个。

还需要添加一点，用于使接收操作阻塞：一个 `Condvar`（参见["条件变量"](chapter1#条件变量condition-variables)）来通知等待的接收者有新消息。

这种实现可以相当简短且相对简单，如下所示：

```rust
pub struct Channel<T> {
    queue: Mutex<VecDeque<T>>,
    item_ready: Condvar,
}

impl<T> Channel<T> {
    pub fn new() -> Self {
        Self {
            queue: Mutex::new(VecDeque::new()),
            item_ready: Condvar::new(),
        }
    }

    pub fn send(&self, message: T) {
        self.queue.lock().unwrap().push_back(message);
        self.item_ready.notify_one();
    }

    pub fn receive(&self) -> T {
        let mut b = self.queue.lock().unwrap();
        loop {
            if let Some(message) = b.pop_front() {
                return message;
            }
            b = self.item_ready.wait(b).unwrap();
        }
    }
}
```

注意，我们不需要使用任何原子操作或不安全代码，也不需要考虑 `Send` 或 `Sync` 特性。编译器理解 `Mutex` 的接口及其提供的保证，并会隐含地理解，如果 `Mutex<T>` 和 `Condvar` 都可以安全地在线程间共享，那么我们的 `Channel<T>` 也可以。我们的 `send` 函数锁定互斥锁以将新消息推送到队列末尾，并在解锁队列后使用条件变量直接通知一个可能正在等待的接收者。

`receive` 函数也锁定互斥锁以从队列前端弹出下一条消息，但如果没有消息可用，它将使用条件变量等待。

> 记住，`Condvar::wait` 方法在等待时会解锁 `Mutex`，并在返回前重新锁定它。所以，我们的 `receive` 函数在等待时不会保持互斥锁锁定。

虽然这个通道在使用上非常灵活，因为它允许任意数量的发送和接收线程，但在许多情况下，它的实现远非最优。即使有很多消息准备接收，任何发送或接收操作都会短暂地阻塞任何其他发送或接收操作，因为它们都必须锁定同一个互斥锁。如果 `VecDeque::push` 必须增长 `VecDeque` 的容量，所有发送和接收线程都必须等待该线程完成重新分配，这在某些情况下可能是不可接受的。

另一个可能不受欢迎的特性是，这个通道的队列可能无限增长。没有什么能阻止发送者以高于接收者处理速度的速率持续发送新消息。

## **不安全的一次性通道**（An Unsafe One-Shot Channel）

通道的用例种类几乎是无穷无尽的。然而，在本章的其余部分，我们将专注于一种特定类型的用例：从一个线程向另一个线程恰好发送一条消息。为这种用例设计的通道通常称为一次性通道。

我们可以采用上面基于 `Mutex<VecDeque>` 的实现，并将 `VecDeque` 替换为 `Option`，从而有效地将队列的容量减少到恰好一条消息。这将避免分配，但仍然具有使用 `Mutex` 的一些相同缺点。我们可以通过使用原子操作从头开始构建自己的一次性通道来避免这种情况。

首先，让我们构建一个一次性通道的最小实现，而不太考虑其接口。在本章后面，我们将探索改进其接口的方法，以及如何与 Rust 的类型系统合作，为我们的通道用户提供良好的体验。

我们开始所需的工具基本上与我们用于 `SpinLock<T>`（来自[第4章](chapter4)）的工具相同：一个用于存储的 `UnsafeCell` 和一个指示其状态的 `AtomicBool`。在这种情况下，我们使用原子布尔值来指示消息是否准备好被消费。

在发送消息之前，通道是"空的"，还不包含任何类型为 `T` 的消息。我们可以在单元内部使用 `Option<T>` 来允许 `T` 的缺失。然而，这可能会浪费宝贵的内存空间，因为我们的原子布尔值已经告诉我们是否有消息。相反，我们可以使用 `std::mem::MaybeUninit<T>`，这本质上是 `Option<T>` 的底层不安全版本：它要求用户手动跟踪它是否已被初始化，并且几乎它的整个接口都是不安全的，因为它无法执行自己的检查。

将所有这些放在一起，我们从这个结构定义开始我们的第一次尝试：

```rust
use std::mem::MaybeUninit;

pub struct Channel<T> {
    message: UnsafeCell<MaybeUninit<T>>,
    ready: AtomicBool,
}
```

就像对我们的 `SpinLock<T>` 一样，我们需要告诉编译器我们的通道可以安全地在线程间共享，或者至少在 `T` 是 `Send` 时如此：

```rust
unsafe impl<T> Sync for Channel<T> where T: Send {}
```

新通道是空的，`ready` 设置为 `false`，`message` 保持未初始化：

```rust
impl<T> Channel<T> {
    pub const fn new() -> Self {
        Self {
            message: UnsafeCell::new(MaybeUninit::uninit()),
            ready: AtomicBool::new(false),
        }
    }
    // ...
}
```

要发送消息，首先需要将其存储在单元中，然后我们可以通过将 `ready` 标志设置为 `true` 来将其释放给接收者。尝试多次执行此操作将是危险的，因为在设置 `ready` 标志后，接收者可能随时读取消息，这可能与第二次尝试发送消息竞争。目前，我们通过使方法不安全并给用户留下注释来将此责任交给用户：

```rust
/// 安全性：只调用一次！
pub unsafe fn send(&self, message: T) {
    (*self.message.get()).write(message);
    self.ready.store(true, Release);
}
```

在上面的代码片段中，我们使用 `UnsafeCell::get` 方法获取指向 `MaybeUninit<T>` 的指针，并不安全地解引用它来调用 `MaybeUninit::write` 以初始化它。如果误用，这可能导致未定义行为，但我们已经将此责任推给了调用者。

对于内存排序，我们需要使用释放排序，因为原子存储有效地将消息释放给接收者。这确保了如果接收线程以获取排序从 `self.ready` 加载 `true`，那么从接收线程的角度来看，消息的初始化将完成。

对于接收，我们暂时不提供阻塞接口。相反，我们将提供两个方法：一个用于检查消息是否可用，另一个用于接收它。如果我们的通道用户想要阻塞，我们将留给他们使用诸如线程挂起（["线程挂起"](chapter1#线程挂起thread-parking)）之类的东西。

以下是完成此版本通道的最后两个方法：

```rust
pub fn is_ready(&self) -> bool {
    self.ready.load(Acquire)
}

/// 安全性：只调用一次，
/// 并且仅在 is_ready() 返回 true 之后！
pub unsafe fn receive(&self) -> T {
    (*self.message.get()).assume_init_read()
}
```

虽然 `is_ready` 方法始终可以安全调用，但 `receive` 方法使用 `MaybeUninit::assume_init_read()`，它不安全地假设它已经被初始化，并且它没有被用来产生非 `Copy` 对象的多个副本。就像 `send` 一样，我们通过使函数本身不安全来简单地让用户处理这个问题。

结果是一个技术上可用的通道，但它笨拙且通常令人失望。如果使用得当，它确实能做到它应该做的事情，但有许多微妙的方式会误用它。

多次调用 `send` 可能导致数据竞争，因为第二个发送者将在接收者可能试图读取第一条消息时覆盖数据。即使接收被正确同步，从多个线程调用 `send` 可能导致两个线程同时尝试写入单元，再次导致数据竞争。此外，多次调用 `receive` 会产生消息的两个副本，即使 `T` 没有实现 `Copy` 因此不能被安全地复制。

一个更微妙的问题是我们的通道缺少 `Drop` 实现。`MaybeUninit` 类型不跟踪它是否已被初始化，因此不会在丢弃时自动丢弃其内容。这意味着如果发送了一条消息但从未被接收，该消息将永远不会被丢弃。这不是不安全的，但仍然是要避免的。虽然在 Rust 中泄漏被普遍认为是安全的，但通常只作为另一个泄漏的结果才是可接受的。例如，泄漏一个 `Vec` 也会泄漏其内容，但 `Vec` 的常规使用不会导致任何泄漏。

由于我们让用户负责一切，这只是时间问题，最终会导致不幸的事故。

## **通过运行时检查实现安全性**（Safety Through Runtime Checks）

为了提供更安全的接口，我们可以添加一些检查，使误用导致带有清晰消息的恐慌，这比未定义行为要好得多。

让我们从在消息准备好之前调用 `receive` 的问题开始。这个很容易处理，因为我们需要做的就是在尝试读取消息之前让 `receive` 方法验证 `ready` 标志：

```rust
/// 如果消息尚未可用则恐慌。
///
/// 提示：先使用 `is_ready` 检查。
///
/// 安全性：只调用一次！
pub unsafe fn receive(&self) -> T {
    if !self.ready.load(Acquire) {
        panic!("no message available!");
    }
    (*self.message.get()).assume_init_read()
}
```

该函数仍然不安全，因为用户仍然负责不多次调用此函数，但未能先检查 `is_ready()` 不再导致未定义行为。

由于我们现在在 `receive` 方法内部有一个 `ready` 标志的获取加载，提供了必要的同步，我们可以将 `is_ready` 中的加载内存排序降低到宽松，因为那个现在仅用于指示目的：

```rust
pub fn is_ready(&self) -> bool {
    self.ready.load(Relaxed)
}
```

记住，`ready` 上的总修改顺序（参见["宽松排序"](chapter3#宽松排序relaxed-ordering)）保证在 `is_ready` 从中加载 `true` 后，`receive` 也将看到 `true`。无论 `is_ready` 中使用何种内存排序，都不可能出现 `is_ready` 返回 `true` 而 `receive()` 仍然恐慌的情况。

接下来要解决的问题是多次调用 `receive` 会发生什么。我们也可以通过在我们的 `receive` 方法中将 `ready` 标志设置回 `false` 来使其导致恐慌，就像这样：

```rust
/// 如果消息尚未可用，或者消息已被消费，则恐慌。
///
/// 提示：先使用 `is_ready` 检查。
pub fn receive(&self) -> T {
    if !self.ready.swap(false, Acquire) {
        panic!("no message available!");
    }
    // 安全性：我们刚刚检查（并重置）了 ready 标志。
    unsafe { (*self.message.get()).assume_init_read() }
}
```

我们简单地将加载改为交换为 `false`，突然之间，`receive` 方法在任何条件下都可以安全调用了。该函数不再标记为不安全。我们不再让用户负责一切，而是现在对不安全代码负责，从而减少了用户的压力。

对于 `send`，情况稍微复杂一些。为了防止多个 `send` 调用同时访问单元，我们需要知道另一个 `send` 调用是否已经开始。`ready` 标志只告诉我们另一个 `send` 调用是否已经完成，所以这不够。

让我们添加第二个标志，名为 `in_use`，来指示通道是否已被使用：

```rust
pub struct Channel<T> {
    message: UnsafeCell<MaybeUninit<T>>,
    in_use: AtomicBool, // 新！
    ready: AtomicBool,
}

impl<T> Channel<T> {
    pub const fn new() -> Self {
        Self {
            message: UnsafeCell::new(MaybeUninit::uninit()),
            in_use: AtomicBool::new(false), // 新！
            ready: AtomicBool::new(false),
        }
    }
    // ...
}
```

现在我们需要做的就是在 `send` 方法中将 `in_use` 设置为 `true`，然后再访问单元，如果它已经被另一个调用设置，则恐慌：

```rust
/// 尝试发送超过一条消息时恐慌。
pub fn send(&self, message: T) {
    if self.in_use.swap(true, Relaxed) {
        panic!("can't send more than one message!");
    }
    unsafe { (*self.message.get()).write(message) };
    self.ready.store(true, Release);
}
```

我们可以对原子交换操作使用宽松内存排序，因为 `in_use` 的总修改顺序（参见["宽松排序"](chapter3#宽松排序relaxed-ordering)）保证在 `in_use` 上只会有一个交换操作返回 `false`，这是 `send` 将尝试访问单元的唯一情况。

我们现在有了一个完全安全的接口，尽管还有一个问题。最后一个剩余问题发生在发送一条从未被接收的消息时：它将永远不会被丢弃。虽然这不会导致未定义行为并且在安全代码中是允许的，但这绝对是应该避免的。

由于我们在 `receive` 方法中重置了 `ready` 标志，修复这个问题很容易：`ready` 标志指示单元中是否有一条尚未接收的需要被丢弃的消息。

在我们的 `Channel` 的 `Drop` 实现中，我们不需要使用原子操作来检查原子 `ready` 标志，因为一个对象只有在完全被丢弃它的线程拥有，没有未完成的借用时才能被丢弃。这意味着我们可以使用 `AtomicBool::get_mut` 方法，它接受一个独占引用（`&mut self`），证明原子访问是不必要的。对于 `UnsafeCell` 也是如此，通过 `UnsafeCell::get_mut`。

使用这个，以下是我们完全安全且不泄漏的通道的最后一部分：

```rust
impl<T> Drop for Channel<T> {
    fn drop(&mut self) {
        if *self.ready.get_mut() {
            unsafe { self.message.get_mut().assume_init_drop() }
        }
    }
}
```

让我们试试看！

由于我们的 `Channel` 不提供阻塞接口（暂时），我们将手动使用线程停车来等待消息。接收线程将在没有消息准备好时 `park()` 自己，发送线程将在发送内容后 `unpark()` 接收者。

这是一个完整的测试程序，通过我们的 `Channel` 从第二个线程向主线程发送字符串字面量 `"hello world!"`：

```rust
fn main() {
    let channel = Channel::new();
    let t = thread::current();
    thread::scope(|s| {
        s.spawn(|| {
            channel.send("hello world!");
            t.unpark();
        });
        while !channel.is_ready() {
            thread::park();
        }
        assert_eq!(channel.receive(), "hello world!");
    });
}
```

这个程序可以编译、运行并干净地退出，显示我们的 `Channel` 按预期工作。

如果我们复制 `send` 行，我们还可以看到我们的一个安全检查在起作用，当程序运行时产生以下恐慌消息：

```
thread '<unnamed>' panicked at 'can't send more than one message!', src/main.rs
```

虽然一个恐慌的程序并不好，但让程序可靠地恐慌比接近未定义行为的潜在恐怖要好得多。

>**使用单个原子变量表示通道状态**
>
如果你对实现通道还意犹未尽，这里有一个可以节省一个字节内存的微妙变体。
>
我们不使用两个独立的原子布尔值来表示通道的状态，而是使用一个 `AtomicU8` 来表示所有四种状态。我们将不得不使用 `compare_exchange` 来原子性地检查通道是否处于预期状态并将其更改为另一个状态，而不是原子地交换布尔值。
>
>```rust
>const EMPTY: u8 = 0;
>const WRITING: u8 = 1;
>const READY: u8 = 2;
>const READING: u8 = 3;
>
>pub struct Channel<T> {
>      message: UnsafeCell<MaybeUninit<T>>,
>      state: AtomicU8,
>}
>
>unsafe impl<T: Send> Sync for Channel<T> {}
>
>impl<T> Channel<T> {
>       pub const fn new() -> Self {
>          Self {
>            message: UnsafeCell::new(MaybeUninit::uninit()),
>            state: AtomicU8::new(EMPTY),
>          }
>       }
>
>       pub fn send(&self, message: T) {
>            if self.state.compare_exchange(EMPTY, WRITING, Relaxed, >Relaxed).is_err() {
>               panic!("can't send more than one message!");
>            }
>            unsafe { (*self.message.get()).write(message) };
>            self.state.store(READY, Release);
>       }
>
>        pub fn is_ready(&self) -> bool {
>            self.state.load(Relaxed) == READY
>        }
>
>        pub fn receive(&self) -> T {
>             if self.state.compare_exchange(READY, READING, Acquire, >Relaxed).is_err() {
>                panic!("no message available!");
>             }
>             unsafe { (*self.message.get()).assume_init_read() }
>        }
>}
>
>impl<T> Drop for Channel<T> {
>        fn drop(&mut self) {
>             if *self.state.get_mut() == READY {
>                unsafe { self.message.get_mut().assume_init_drop() }
>             }
>        }
>}
>```