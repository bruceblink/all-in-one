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



## **通过类型实现安全**（Safety Through Types）

虽然我们已经成功地保护了 `Channel` 的用户免受未定义行为的影响，但如果他们意外地错误使用它，仍然面临恐慌的风险。理想情况下，编译器会检查正确用法，并在程序运行前指出误用。

让我们看看多次调用 `send` 或 `receive` 的问题。

为了防止一个函数被多次调用，我们可以让它按值获取一个参数，这对于非 `Copy` 类型来说将消耗该对象。一个对象被消耗或移动后，就从调用者那里消失了，防止了它被再次使用。

通过将调用 `send` 或 `receive` 的能力各自表示为一个单独的（非 `Copy`）类型，并在执行操作时消耗该对象，我们可以确保每个操作只能发生一次。

这给我们带来了以下接口设计：通道不再由单个 `Channel` 类型表示，而是由一对 `Sender` 和 `Receiver` 表示，它们各自有一个按值获取 `self` 的方法：

```rust
pub fn channel<T>() -> (Sender<T>, Receiver<T>) { … }
pub struct Sender<T> { … }
pub struct Receiver<T> { … }

impl<T> Sender<T> {
    pub fn send(self, message: T) { … }
}

impl<T> Receiver<T> {
    pub fn is_ready(&self) -> bool { … }
    pub fn receive(self) -> T { … }
}
```

用户可以通过调用 `channel()` 来创建通道，这将给他们一个 `Sender` 和一个 `Receiver`。他们可以自由地传递这些对象中的每一个，将它们移动到另一个线程，等等。但是，他们最终不能拥有其中任何一个的多个副本，从而保证 `send` 和 `receive` 每个都只能被调用一次。

为了实现这一点，我们需要为我们的 `UnsafeCell` 和 `AtomicBool` 找到一个存放位置。之前，我们只有一个包含这些字段的结构体，但现在我们有两个独立的结构体，每个都可能比另一个存活得更久。

由于发送者和接收者需要共享这些变量的所有权，我们将使用 `Arc`（["引用计数"](chapter1#引用计数reference-counting)）来为我们提供一个引用计数的共享分配，在其中存储共享的 `Channel` 对象。如下所示，`Channel` 类型不必是公开的，因为它的存在只是一个与用户无关的实现细节。

```rust
pub struct Sender<T> {
    channel: Arc<Channel<T>>,
}

pub struct Receiver<T> {
    channel: Arc<Channel<T>>,
}

struct Channel<T> { // 不再是 `pub`
    message: UnsafeCell<MaybeUninit<T>>,
    ready: AtomicBool,
}

unsafe impl<T> Sync for Channel<T> where T: Send {}
```

就像之前一样，我们在 `T` 是 `Send` 的条件下为 `Channel<T>` 实现 `Sync`，以允许它在线程间使用。

注意，我们不再需要像之前通道实现中那样的 `in_use` 原子布尔值。它仅被 `send` 用来检查它没有被多次调用，而这现在通过类型系统得到了静态保证。

创建通道和发送者-接收者对的 `channel` 函数类似于我们之前拥有的 `Channel::new` 函数，除了它将 `Channel` 包装在 `Arc` 中，并将该 `Arc` 及其克隆包装在 `Sender` 和 `Receiver` 类型中：

```rust
pub fn channel<T>() -> (Sender<T>, Receiver<T>) {
    let a = Arc::new(Channel {
        message: UnsafeCell::new(MaybeUninit::uninit()),
        ready: AtomicBool::new(false),
    });
    (Sender { channel: a.clone() }, Receiver { channel: a })
}
```

`send`、`is_ready` 和 `receive` 方法基本上与我们之前实现的方法相同，但有一些区别：

- 它们现在被移到各自的类型中，这样只有（唯一的）发送者可以发送，只有（唯一的）接收者可以接收。
- `send` 和 `receive` 现在按值而不是按引用获取 `self`，以确保它们每个都只能被调用一次。
- `send` 不再可能恐慌，因为它的前提条件（只被调用一次）现在得到了静态保证。

所以，它们现在看起来像这样：

```rust
impl<T> Sender<T> {
    /// 这永远不会恐慌。 :)
    pub fn send(self, message: T) {
        unsafe { (*self.channel.message.get()).write(message) };
        self.channel.ready.store(true, Release);
    }
}

impl<T> Receiver<T> {
    pub fn is_ready(&self) -> bool {
        self.channel.ready.load(Relaxed)
    }

    pub fn receive(self) -> T {
        if !self.channel.ready.swap(false, Acquire) {
            panic!("no message available!");
        }
        unsafe { (*self.channel.message.get()).assume_init_read() }
    }
}
```

`receive` 函数仍然可能恐慌，因为用户仍然可能在 `is_ready()` 返回 `true` 之前调用它。它仍然使用 `swap` 将 `ready` 标志设置回 `false`（而不仅仅是 `load`），以便 `Channel` 的 `Drop` 实现知道是否有一条未读的消息需要被丢弃。

那个 `Drop` 实现与我们之前实现的完全相同：

```rust
impl<T> Drop for Channel<T> {
    fn drop(&mut self) {
        if *self.ready.get_mut() {
            unsafe { self.message.get_mut().assume_init_drop() }
        }
    }
}
```

当 `Sender<T>` 或 `Receiver<T>` 被丢弃时，`Arc<Channel<T>>` 的 `Drop` 实现将减少分配的引用计数。当丢弃第二个时，该计数达到零，`Channel<T>` 本身被丢弃。这将调用我们上面的 `Drop` 实现，在那里如果发送了消息但未被接收，我们可以丢弃该消息。

让我们试试看：

```rust
fn main() {
    thread::scope(|s| {
        let (sender, receiver) = channel();
        let t = thread::current();
        s.spawn(move || {
            sender.send("hello world!");
            t.unpark();
        });
        while !receiver.is_ready() {
            thread::park();
        }
        assert_eq!(receiver.receive(), "hello world!");
    });
}
```

我们仍然必须手动使用线程停车来等待消息，这有点不方便，但我们稍后会处理这个问题。

目前，我们的目标是至少在编译时使一种形式的误用成为不可能。与上次不同，尝试发送两次不会导致程序恐慌，而是根本不会产生有效的程序。如果我们在上面的工作程序中添加另一个 `send` 调用，编译器现在会捕捉到问题并耐心地告知我们的错误：

```
error[E0382]: use of moved value: `sender`
--> src/main.rs
|
|     sender.send("hello world!");
|     --------------------
|     `sender` moved due to this method call
|
|     sender.send("second message");
|     ^^^^^^ value used here after move
note: this function takes ownership of the receiver `self`, which moves `sender`
--> src/lib.rs
|
|     pub fn send(self, message: T) {
|                ^^^^
= note: move occurs because `sender` has type `Sender<&str>`, which does not implement the `Copy` trait
```

根据情况，设计一个能在编译时捕捉错误的接口可能非常棘手。如果情况确实适合这样的接口，它不仅能为用户带来更多便利，还能减少对现在已得到静态保证的事物的运行时检查。例如，我们不再需要 `in_use` 标志，并从 `send` 方法中移除了交换和检查。

不幸的是，可能会出现新的问题，导致更多的运行时开销。在这个案例中，问题是分裂的所有权，为此我们不得不求助于 `Arc` 并支付分配的成本。

必须在安全性、便利性、灵活性、简单性和性能之间进行权衡是不幸的，但有时是不可避免的。Rust 通常努力让在所有方面都表现出色变得容易，但有时会让你牺牲一点某方面以最大化另一方面。

## **通过借用避免分配**（Borrowing to Avoid Allocation）

我们刚刚设计的基于 `Arc` 的通道实现使用起来非常方便，但代价是一些性能，因为它必须分配内存。如果我们想要优化效率，可以通过让用户负责共享的 `Channel` 对象来用一些便利性换取性能。我们不再在幕后处理 `Channel` 的分配和所有权，而是强制用户创建一个可以被 `Sender` 和 `Receiver` 借用的 `Channel`。这样，他们可以选择简单地将 `Channel` 放在局部变量中，避免分配内存的开销。

我们还将不得不牺牲一些简单性，因为我们现在必须处理借用和生命周期。

因此，这三种类型现在将如下所示，`Channel` 再次公开，`Sender` 和 `Receiver` 在一定生命周期内借用它：

```rust
pub struct Channel<T> {
    message: UnsafeCell<MaybeUninit<T>>,
    ready: AtomicBool,
}

unsafe impl<T> Sync for Channel<T> where T: Send {}

pub struct Sender<'a, T> {
    channel: &'a Channel<T>,
}

pub struct Receiver<'a, T> {
    channel: &'a Channel<T>,
}
```

我们不再使用 `channel()` 函数来创建 `(Sender, Receiver)` 对，而是回到本章早些时候使用的 `Channel::new`，允许用户将这样的对象创建为局部变量。

此外，我们需要一种方法让用户创建将借用 `Channel` 的 `Sender` 和 `Receiver` 对象。这将需要是一个独占借用（`&mut Channel`），以确保同一通道不能有多个发送者或接收者。通过同时提供 `Sender` 和 `Receiver`，我们可以将独占借用拆分为两个共享借用，这样发送者和接收者都可以引用通道，同时防止其他任何东西接触通道。

这导致了以下实现：

```rust
impl<T> Channel<T> {
    pub const fn new() -> Self {
        Self {
            message: UnsafeCell::new(MaybeUninit::uninit()),
            ready: AtomicBool::new(false),
        }
    }

    pub fn split<'a>(&'a mut self) -> (Sender<'a, T>, Receiver<'a, T>) {
        *self = Self::new();
        (Sender { channel: self }, Receiver { channel: self })
    }
}
```

具有稍微复杂签名的 `split` 方法值得仔细看看。它通过独占引用独占地借用 `self`，但将其拆分为两个共享引用，包装在 `Sender` 和 `Receiver` 类型中。生命周期 `'a` 清楚地表明这两个对象都借用了具有有限生命周期的东西；在这种情况下，就是 `Channel` 本身。由于 `Channel` 是独占借用的，只要 `Sender` 或 `Receiver` 对象存在，调用者将不能借用或移动它。

然而，一旦这些对象都不存在了，可变借用就会过期，编译器乐意让 `Channel` 对象被第二次调用 `split()` 时再次借用。虽然我们可以假设在 `Sender` 和 `Receiver` 仍然存在时不能再次调用 `split()`，但我们不能防止在这些对象被丢弃或遗忘后第二次调用 `split()`。我们需要确保不会意外地为已经设置了 `ready` 标志的通道创建新的 `Sender` 或 `Receiver` 对象，因为这会破坏防止未定义行为的假设。

通过在 `split()` 中用一个新的空通道覆盖 `*self`，我们确保在创建 `Sender` 和 `Receiver` 状态时它处于预期状态。这也调用了旧的 `*self` 上的 `Drop` 实现，它将负责丢弃之前发送但未接收的消息。

由于 `split` 签名中的生命周期来自 `self`，因此可以省略。上面代码片段中 `split` 的签名与这个更简洁的版本相同：

```rust
pub fn split(&mut self) -> (Sender<T>, Receiver<T>) { … }
```

虽然这个版本没有明确显示返回的对象借用 `self`，但编译器仍然会检查生命周期的正确使用，就像它检查更详细的版本一样。

其余的方法和 `Drop` 实现与基于 `Arc` 的实现相同，除了为 `Sender` 和 `Receiver` 类型添加了一个额外的 `'_` 生命周期参数。（如果你忘记了这些，编译器会建议添加它们。）

为了完整起见，以下是剩余的代码：

```rust
impl<T> Sender<'_, T> {
    pub fn send(self, message: T) {
        unsafe { (*self.channel.message.get()).write(message) };
        self.channel.ready.store(true, Release);
    }
}

impl<T> Receiver<'_, T> {
    pub fn is_ready(&self) -> bool {
        self.channel.ready.load(Relaxed)
    }

    pub fn receive(self) -> T {
        if !self.channel.ready.swap(false, Acquire) {
            panic!("no message available!");
        }
        unsafe { (*self.channel.message.get()).assume_init_read() }
    }
}

impl<T> Drop for Channel<T> {
    fn drop(&mut self) {
        if *self.ready.get_mut() {
            unsafe { self.message.get_mut().assume_init_drop() }
        }
    }
}
```

让我们测试一下！

```rust
fn main() {
    let mut channel = Channel::new();
    thread::scope(|s| {
        let (sender, receiver) = channel.split();
        let t = thread::current();
        s.spawn(move || {
            sender.send("hello world!");
            t.unpark();
        });
        while !receiver.is_ready() {
            thread::park();
        }
        assert_eq!(receiver.receive(), "hello world!");
    });
}
```

与基于 `Arc` 的版本相比，便利性的降低非常小：我们只需要多一行来手动创建一个 `Channel` 对象。但请注意，通道必须在作用域之前创建，以向编译器证明它的存在将比发送者和接收者都长。

要查看编译器的借用检查器如何工作，可以尝试在不同位置添加第二次对 `channel.split()` 的调用。你会看到，在线程作用域内第二次调用会导致错误，而在作用域之后调用则是可以接受的。甚至在作用域之前调用 `split()` 也是可以的，只要你在作用域开始之前停止使用返回的 `Sender` 和 `Receiver`。

## **阻塞**（Blocking）

最后，让我们解决 `Channel` 剩下的主要不便之处：缺乏阻塞接口。每次测试我们的通道新变体时，我们已经使用了线程停车。将这种模式集成到通道本身应该不会太难。

为了能够唤醒接收者，发送者需要知道要唤醒哪个线程。`std::thread::Thread` 类型表示线程的句柄，正是我们调用 `unpark()` 所需要的。我们将在 `Sender` 对象内部存储接收线程的句柄，如下所示：

```rust
use std::thread::Thread;

pub struct Sender<'a, T> {
    channel: &'a Channel<T>,
    receiving_thread: Thread, // 新字段！
}
```

然而，如果 `Receiver` 对象在线程之间发送，这个句柄将引用错误的线程。`Sender` 将不知道这一点，仍然引用最初持有 `Receiver` 的线程。

我们可以通过使 `Receiver` 受到更多限制来解决这个问题，不允许它再在线程之间发送。正如["线程安全性：Send 和 Sync"](chapter1#线程安全send-和-sync-thread-safety-send-and-sync)中所讨论的，我们可以使用特殊的 `PhantomData` 标记类型将此限制添加到我们的结构体中。`PhantomData<*const ()>` 可以完成这项工作，因为原始指针（例如 `*const ()`）没有实现 `Send`：

```rust
pub struct Receiver<'a, T> {
    channel: &'a Channel<T>,
    _no_send: PhantomData<*const ()>, // 新字段！
}
```

接下来，我们必须修改 `Channel::split` 方法来填充新字段，如下所示：

```rust
pub fn split<'a>(&'a mut self) -> (Sender<'a, T>, Receiver<'a, T>) {
    *self = Self::new();
    (
        Sender {
            channel: self,
            receiving_thread: thread::current(), // 新字段！
        },
        Receiver {
            channel: self,
            _no_send: PhantomData, // 新字段！
        }
    )
}
```

我们使用当前线程的句柄作为 `receiving_thread` 字段，因为我们返回的 `Receiver` 对象将停留在当前线程上。

`send` 方法变化不大，如下所示。我们只需在 `receiving_thread` 上调用 `unpark()`，以便在接收者等待时唤醒它：

```rust
impl<T> Sender<'_, T> {
    pub fn send(self, message: T) {
        unsafe { (*self.channel.message.get()).write(message) };
        self.channel.ready.store(true, Release);
        self.receiving_thread.unpark(); // 新代码！
    }
}
```

`receive` 函数经历了一个稍大的变化。新版本在还没有消息时不会恐慌，而是会使用 `thread::park()` 耐心等待消息，并尝试多次（必要时）：

```rust
impl<T> Receiver<'_, T> {
    pub fn receive(self) -> T {
        while !self.channel.ready.swap(false, Acquire) {
            thread::park();
        }
        unsafe { (*self.channel.message.get()).assume_init_read() }
    }
}
```

请记住，`thread::park()` 可能会虚假返回。（或者因为除我们的 `send` 方法之外的某些东西调用了 `unpark()`。）这意味着我们不能假设 `park()` 返回时 `ready` 标志已经被设置。因此，我们需要使用一个循环在唤醒后再次检查该标志。

`Channel<T>` 结构体、其 `Sync` 实现、其 `new` 函数和其 `Drop` 实现保持不变。

让我们试试看！

```rust
fn main() {
    let mut channel = Channel::new();
    thread::scope(|s| {
        let (sender, receiver) = channel.split();
        s.spawn(move || {
            sender.send("hello world!");
        });
        assert_eq!(receiver.receive(), "hello world!");
    });
}
```

显然，这个 `Channel` 比上一个更易于使用，至少在这个简单的测试程序中是这样。我们为这种便利性付出了代价，牺牲了一些灵活性：只有调用 `split()` 的线程才能调用 `receive()`。如果你交换 `send` 和 `receive` 行，这个程序将不再编译。根据使用场景，这可能完全可以、有用，或非常不便。

有许多方法可以解决这个问题，其中许多会增加我们的复杂性并影响性能。一般来说，我们可以继续探索的变化和权衡几乎是无穷无尽的。

我们可以轻易花费大量不健康的时间来实现一次性通道的另外二十个变体，每个变体都有略有不同的特性，适用于每个可以想象的用例以及更多。虽然这听起来很有趣，但我们可能应该避免掉进这个兔子洞，在事情失控之前结束本章。

## **总结**（Summary）

- 通道用于在线程之间发送消息。
- 一个简单、灵活但可能效率不高的通道相对容易实现，只需一个 `Mutex` 和一个 `Condvar`。
- 一次性通道是设计用于只发送一条消息的通道。
- `MaybeUninit<T>` 类型可用于表示可能尚未初始化的 `T`。其接口大部分不安全，使其用户负责跟踪它是否已初始化、不复制 `Copy` 数据以及在必要时丢弃其内容。
- 不丢弃对象（也称为泄漏或忘记）是安全的，但在没有充分理由的情况下这样做是不受欢迎的。
- 恐慌是创建安全接口的重要工具。
- 按值获取非 `Copy` 对象可用于防止某些事情被多次执行。
- 独占借用和拆分借用可以是强制正确性的强大工具。
- 我们可以通过确保对象的类型不实现 `Send` 来确保对象停留在同一线程上，这可以通过 `PhantomData` 标记类型实现。
- 每个设计和实现决策都涉及权衡，最好在考虑特定用例的情况下做出。
- 在没有用例的情况下设计某些东西可能很有趣且具有教育意义，但可能变成一项无尽的任务。