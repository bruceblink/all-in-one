---
sidebar_position: 5
typora-root-url: ./..\..\static
---

# 第 2 章 原子操作（Atomics）

"原子"一词源于希腊语 ἄτομος，意为不可分割，即无法被切割成更小部分的事物。在计算机科学中，它被用来描述一种不可分割的操作：要么完全完成，要么尚未发生。

如["借用与数据竞争"](chapter1#借用与数据竞争borrowing-and-data-races)一节所述，多个线程并发读取和修改同一个变量通常会导致未定义行为。然而，原子操作确实允许不同线程安全地读取和修改同一个变量。由于这种操作是不可分割的，它要么完全发生在另一个操作之前，要么完全发生在之后，从而避免了未定义行为。我们将在[第7章]()看到这在硬件层面是如何运作的。

原子操作是所有涉及多线程操作的主要构建模块。所有其他并发原语，如互斥锁和条件变量，都是使用原子操作实现的。

在 Rust 中，原子操作作为标准原子类型（位于 `std::sync::atomic` 模块中）的方法提供。它们的名称都以 `Atomic` 开头，例如 `AtomicI32` 或 `AtomicUsize`。具体可用的类型取决于硬件架构，有时也取决于操作系统，但几乎所有平台都至少提供指针大小以内的所有原子类型。

与大多数类型不同，它们允许通过共享引用（例如 `&AtomicU8`）进行修改。这得益于内部可变性，正如["内部可变性"](chapter1#内部可变性interior-mutability)一节所讨论的那样。

每个可用的原子类型都有相同的接口，包含存储和加载的方法、原子性的"取改"操作方法，以及一些更高级的"比较并交换"方法。我们将在本章剩余部分详细讨论它们。

但是，在我们深入探讨不同的原子操作之前，需要简要地提及一个称为"内存排序"的概念：

每个原子操作都接受一个 `std::sync::atomic::Ordering` 类型的参数，它决定了我们能得到关于操作相对顺序的何种保证。保证最少的、最简单的变体是 `Relaxed`（宽松排序）。`Relaxed` 仍然保证单个原子变量的一致性，但不对不同变量之间的操作相对顺序做出任何承诺。

这意味着，两个线程可能会看到对不同变量的操作以不同的顺序发生。例如，如果一个线程首先写入一个变量，然后很快地写入第二个变量，另一个线程可能会看到这些操作以相反的顺序发生。

在本章中，我们只关注那些不存在此问题的用例，并简单地随处使用 `Relaxed` 而不深入细节。我们将在[第3章]()详细讨论内存排序的所有细节以及其他可用的内存排序。

## **原子加载与存储操作**（Atomic Load and Store Operations）

我们将首先介绍两个最基本的原子操作：加载和存储。

以 `AtomicI32` 为例，它们的函数签名如下：
```rust
impl AtomicI32 {
    pub fn load(&self, ordering: Ordering) -> i32;
    pub fn store(&self, value: i32, ordering: Ordering);
}
```
`load` 方法原子性地加载原子变量中存储的值，`store` 方法原子性地在其中存储一个新值。请注意，即使 `store` 方法修改了值，它接受的也是一个共享引用（`&T`），而不是独占引用（`&mut T`）。

让我们看一些这两个方法的实际用例。

### **示例：停止标志**（Example: Stop Flag）

第一个示例使用 `AtomicBool` 作为停止标志。这样的标志用于通知其他线程停止运行。

```rust
use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering::Relaxed;

fn main() {
    static STOP: AtomicBool = AtomicBool::new(false);

    // 派生一个线程来执行工作。
    let background_thread = thread::spawn(|| {
        while !STOP.load(Relaxed) {
            some_work();
        }
    });

    // 使用主线程监听用户输入。
    for line in std::io::stdin().lines() {
        match line.unwrap().as_str() {
            "help" => println!("commands: help, stop"),
            "stop" => break,
            cmd => println!("unknown command: {cmd:?}"),
        }
    }

    // 通知后台线程它需要停止。
    STOP.store(true, Relaxed);

    // 等待后台线程完成。
    background_thread.join().unwrap();
}
```
在这个示例中，后台线程重复运行 `some_work()`，而主线程允许用户输入一些命令与程序交互。在这个简单的例子中，唯一有用的命令是 `stop` 来让程序停止。

为了让后台线程停止，原子 `STOP` 布尔值被用来将这个条件传达给后台线程。当前台线程读取到停止命令时，它将标志设置为 `true`，后台线程在每次新迭代之前都会检查该标志。主线程使用 `join` 方法等待后台线程完成其当前迭代。

只要后台线程定期检查这个标志，这个简单的解决方案就能很好地工作。如果它在 `some_work()` 中卡住很长时间，可能会导致停止命令与程序退出之间存在不可接受的延迟。

### **示例：进度报告**（Example: Progress Reporting）

在下一个示例中，我们在后台线程上逐一处理100个项目，同时主线程定期向用户更新进度：

```rust
use std::sync::atomic::AtomicUsize;

fn main() {
    let num_done = AtomicUsize::new(0);
    thread::scope(|s| {
        // 一个用于处理所有100个项目的后台线程。
        s.spawn(|| {
            for i in 0..100 {
                process_item(i); // 假设这需要一些时间。
                num_done.store(i + 1, Relaxed);
            }
        });

        // 主线程每秒显示一次状态更新。
        loop {
            let n = num_done.load(Relaxed);
            if n == 100 { break; }
            println!("Working.. {n}/100 done");
            thread::sleep(Duration::from_secs(1));
        }
    });
    println!("Done!");
}
```
这次，我们使用了一个作用域线程（["作用域线程"](chapter1#作用域线程scoped-threads)），它会自动为我们处理线程的加入（join），并且还允许我们借用局部变量。

每当后台线程处理完一个项目时，它将已处理项目的数量存储在一个 `AtomicUsize` 中。同时，主线程将该数字显示给用户以通知他们进度，大约每秒一次。一旦主线程看到所有100个项目都已处理完毕，它就退出作用域，这会隐式地加入后台线程，并通知用户所有工作都已完成。

#### **同步**（Synchronization）

一旦最后一个项目被处理完，主线程可能需要长达一整秒才能知道，这在最后会引入不必要的延迟。为了解决这个问题，我们可以使用线程挂起（["线程挂起"](chapter1#线程挂起thread-parking)），以便在有主线程可能感兴趣的新信息时，将其从睡眠中唤醒。

这是同一个例子，但现在使用 `thread::park_timeout` 而不是 `thread::sleep`：
```rust
fn main() {
    let num_done = AtomicUsize::new(0);
    let main_thread = thread::current();

    thread::scope(|s| {
        // 一个用于处理所有100个项目的后台线程。
        s.spawn(|| {
            for i in 0..100 {
                process_item(i); // 假设这需要一些时间。
                num_done.store(i + 1, Relaxed);
                main_thread.unpark(); // 唤醒主线程。
            }
        });

        // 主线程显示状态更新。
        loop {
            let n = num_done.load(Relaxed);
            if n == 100 { break; }
            println!("Working.. {n}/100 done");
            thread::park_timeout(Duration::from_secs(1));
        }
    });
    println!("Done!");
}
```
变化不大。我们通过 `thread::current()` 获取了主线程的句柄，现在后台线程在每次状态更新后使用它来唤醒（unpark）主线程。主线程现在使用 `park_timeout` 而不是 `sleep`，这样它就可以被中断。

现在，任何状态更新都会立即报告给用户，同时仍然每秒重复最后一次更新，以表明程序仍在运行。

### **示例：惰性初始化**（Example: Lazy Initialization）

在继续学习更高级的原子操作之前，最后一个示例是关于惰性初始化的。

想象有一个值 `x`，我们从文件中读取它、从操作系统获取它或以其他某种方式计算它，并且我们期望它在程序的一次运行期间是恒定的。也许 `x` 是操作系统的版本，或者总内存量，或者是 tau 的第400位数字。对于这个示例来说，具体是什么并不重要。

既然我们不期望它改变，我们可以只在第一次需要时请求或计算它，并记住结果。第一个需要它的线程将不得不计算该值，但它可以将其存储在原子静态变量中，使其对所有线程可用，包括它自己如果以后再次需要的话。

让我们看一个这样的例子。为了简单起见，我们假设 `x` 永远不会为零，这样我们就可以在它被计算出来之前使用零作为占位符。
```rust
use std::sync::atomic::AtomicU64;

fn get_x() -> u64 {
    static X: AtomicU64 = AtomicU64::new(0);
    let mut x = X.load(Relaxed);
    if x == 0 {
        x = calculate_x();
        X.store(x, Relaxed);
    }
    x
}
```
第一个调用 `get_x()` 的线程将检查静态变量 `X`，发现它仍然是零，计算其值，并将结果存回静态变量中以供将来使用。之后，任何对 `get_x()` 的调用都会看到静态变量中的值非零，并立即返回，而无需重新计算。

然而，如果第二个线程在第一个线程仍在计算 `x` 时调用 `get_x()`，第二个线程也会看到一个零，并同样并行地计算 `x`。其中一个线程最终会覆盖另一个的结果，这取决于哪个线程先完成。这称为竞争。这不是数据竞争（数据竞争是未定义行为，在 Rust 中不使用 `unsafe` 是不可能的），但仍然是一种胜者不可预测的竞争。

由于我们期望 `x` 是常量，谁赢得竞争并不重要，因为无论怎样结果都会相同。根据我们预计 `calculate_x()` 需要花费的时间，这可能是一个非常好或非常糟糕的策略。

如果预计 `calculate_x()` 需要很长时间，那么最好让线程在第一个线程仍在初始化 `X` 时等待，以避免不必要地浪费处理器时间。你可以使用条件变量或线程停放（第24页"等待：停放与条件变量"）来实现这一点，但这对于一个简单例子来说很快就变得太复杂了。Rust 标准库通过 `std::sync::Once` 和 `std::sync::OnceLock` 提供了完全相同的功能，因此通常无需自己实现这些。

## 获取和更新操作（Fetch-and-Modify Operations）

了解了基本加载和存储操作的一些使用场景后，现在让我们转向更有趣的操作：取改操作。这些操作会修改原子变量，但同时会以单个原子操作的形式加载（获取）原始值。

最常用的是 `fetch_add` 和 `fetch_sub`，分别执行加法和减法。其他一些可用的操作包括用于位运算的 `fetch_or` 和 `fetch_and`，以及可用于保持运行中最大值或最小值的 `fetch_max` 和 `fetch_min`。

以 `AtomicI32` 为例，它们的函数签名如下：
```rust
impl AtomicI32 {
    pub fn fetch_add(&self, v: i32, ordering: Ordering) -> i32;
    pub fn fetch_sub(&self, v: i32, ordering: Ordering) -> i32;
    pub fn fetch_or(&self, v: i32, ordering: Ordering) -> i32;
    pub fn fetch_and(&self, v: i32, ordering: Ordering) -> i32;
    pub fn fetch_nand(&self, v: i32, ordering: Ordering) -> i32;
    pub fn fetch_xor(&self, v: i32, ordering: Ordering) -> i32;
    pub fn fetch_max(&self, v: i32, ordering: Ordering) -> i32;
    pub fn fetch_min(&self, v: i32, ordering: Ordering) -> i32;
    pub fn swap(&self, v: i32, ordering: Ordering) -> i32; // "fetch_store"
}
```
其中，有一个操作与众不同，那就是简单地存储一个新值而不关心旧值的操作。它没有被称为 `fetch_store`，而是被称为 `swap`。

下面是一个快速演示，展示 `fetch_add` 如何返回操作前的值：
```rust
use std::sync::atomic::AtomicI32;
let a = AtomicI32::new(100);
let b = a.fetch_add(23, Relaxed);
let c = a.load(Relaxed);
assert_eq!(b, 100);
assert_eq!(c, 123);
```
`fetch_add` 操作将 `a` 从 100 递增到 123，但返回给我们的是旧值 100。任何后续操作都会看到值 123。

这些操作的返回值并非总是相关。如果你只需要将操作应用于原子值，而对值本身不感兴趣，那么直接忽略返回值是完全没问题的。

需要记住的重要一点是，`fetch_add` 和 `fetch_sub` 实现了溢出时的环绕行为。将值递增超过最大可表示值时，会环绕回最小可表示值。这与常规整数的加减运算符行为不同，后者在调试模式下会在溢出时发生恐慌（panic）。

在["比较并交换操作"](chapter2#比较并交换操作-compare-and-exchange-operations)中，我们将看到如何进行带有溢出检查的原子加法。

但首先，让我们看看这些方法的一些实际用例。

### 示例：多线程进度报告 （Example: Progress Reporting from Multiple Threads）

在["示例：进度报告"](chapter2#示例进度报告example-progress-reporting)中，我们使用了一个 `AtomicUsize` 来报告后台线程的进度。如果我们把工作拆分给，例如，四个线程，每个处理 25 个项目，我们就需要知道所有四个线程的进度。

我们可以为每个线程使用一个单独的 `AtomicUsize`，并在主线程中加载它们并求和，但更简单的解决方案是使用一个 `AtomicUsize` 来跟踪所有线程已处理项目的总数。

为了实现这一点，我们不能再使用 `store` 方法，因为那会覆盖其他线程的进度。相反，我们可以使用原子加法操作在每次处理完一个项目后递增计数器。

让我们更新["示例：进度报告"](chapter2#示例进度报告example-progress-reporting)中的代码，将工作拆分给四个线程：
```rust
fn main() {
    let num_done = &AtomicUsize::new(0);
    thread::scope(|s| {
        // 四个后台线程来处理所有 100 个项目，每个 25 个。
        for t in 0..4 {
            s.spawn(move || {
                for i in 0..25 {
                    process_item(t * 25 + i); // 假设这需要一些时间。
                    num_done.fetch_add(1, Relaxed);
                }
            });
        }

        // 主线程每秒显示一次状态更新。
        loop {
            let n = num_done.load(Relaxed);
            if n == 100 { break; }
            println!("Working.. {n}/100 done");
            thread::sleep(Duration::from_secs(1));
        }
    });
    println!("Done!");
}
```
有几个地方发生了变化。最重要的是，我们现在派生四个后台线程而不是一个，并且使用 `fetch_add` 而不是 `store` 来修改 `num_done` 原子变量。

更微妙的是，我们现在为后台线程使用了 `move` 闭包，并且 `num_done` 现在是一个引用。这与我们使用 `fetch_add` 无关，而是与我们在循环中派生四个线程的方式有关。这个闭包捕获了 `t` 以知道它是四个线程中的哪一个，从而知道是从项目 0、25、50 还是 75 开始。如果没有 `move` 关键字，闭包将尝试通过引用捕获 `t`。这是不允许的，因为 `t` 在循环期间只短暂存在。

作为一个 `move` 闭包，它移动（或复制）其捕获的变量而不是借用它们，从而拥有 `t` 的一个副本。因为它也捕获了 `num_done`，所以我们将该变量改为一个引用，因为我们仍然想借用同一个 `AtomicUsize`。注意，原子类型不实现 `Copy` 特性，所以如果我们试图将一个原子变量移动到多个线程中，就会出错。

撇开闭包捕获的微妙之处不谈，在这里使用 `fetch_add` 的更改非常简单。我们不知道线程将以何种顺序递增 `num_done`，但由于加法是原子的，我们不必担心任何事情，并且可以确信当所有线程完成后它正好是 100。

### 示例：统计信息 （Example: Statistics）

延续通过原子操作报告其他线程正在做什么这一概念，让我们扩展示例，以收集和报告处理项目所花费时间的一些统计数据。

除了 `num_done`，我们还添加了两个原子变量 `total_time` 和 `max_time`，以跟踪处理项目所花费的时间量。我们将使用这些数据来报告平均和峰值处理时间。
```rust
fn main() {
    let num_done = &AtomicUsize::new(0);
    let total_time = &AtomicU64::new(0);
    let max_time = &AtomicU64::new(0);

    thread::scope(|s| {
        // 四个后台线程来处理所有 100 个项目，每个 25 个。
        for t in 0..4 {
            s.spawn(move || {
                for i in 0..25 {
                    let start = Instant::now();
                    process_item(t * 25 + i); // 假设这需要一些时间。
                    let time_taken = start.elapsed().as_micros() as u64;
                    num_done.fetch_add(1, Relaxed);
                    total_time.fetch_add(time_taken, Relaxed);
                    max_time.fetch_max(time_taken, Relaxed);
                }
            });
        }

        // 主线程每秒显示一次状态更新。
        loop {
            let total_time = Duration::from_micros(total_time.load(Relaxed));
            let max_time = Duration::from_micros(max_time.load(Relaxed));
            let n = num_done.load(Relaxed);
            if n == 100 { break; }
            if n == 0 {
                println!("Working.. nothing done yet.");
            } else {
                println!(
                    "Working.. {n}/100 done, {:?} average, {:?} peak",
                    total_time / n as u32,
                    max_time,
                );
            }
            thread::sleep(Duration::from_secs(1));
        }
    });
    println!("Done!");
}
```
后台线程现在使用 `Instant::now()` 和 `Instant::elapsed()` 来测量它们在 `process_item()` 中花费的时间。原子加法操作用于将微秒数加到 `total_time` 上，原子最大值操作用于跟踪 `max_time` 中的最高测量值。

主线程将总时间除以已处理项目的数量以获得平均处理时间，然后将其与 `max_time` 中的峰值时间一起报告。

由于三个原子变量是单独更新的，主线程有可能在线程递增了 `num_done` 但尚未更新 `total_time` 时加载这些值，导致平均值被低估。更微妙的是，因为 `Relaxed` 内存排序不能保证从另一个线程看到的操作相对顺序，它甚至可能短暂地看到 `total_time` 的新更新值，但仍然看到 `num_done` 的旧值，导致平均值被高估。

在我们的示例中，这两者都不是大问题。可能发生的最坏情况是向用户短暂报告了一个不准确的平均值。

如果我们想避免这种情况，可以将三个统计数据放在一个 `Mutex` 中。然后在更新这三个数字时短暂地锁定互斥锁，这三个数字本身不再必须是原子的。这有效地将三个更新变成了一个原子操作，代价是锁定和解锁互斥锁，并可能临时阻塞线程。

### 示例：ID 分配 （Example: ID Allocation）

让我们转向一个实际需要 `fetch_add` 返回值的用例。

假设我们需要某个函数 `allocate_new_id()`，每次调用时给出一个新的唯一数字。我们可能使用这些数字来识别程序中的任务或其他事物；这些事物需要通过某种小巧、易于在线程间存储和传递的东西（例如整数）来唯一标识。

使用 `fetch_add` 实现这个函数变得非常简单：
```rust
use std::sync::atomic::AtomicU32;

fn allocate_new_id() -> u32 {
    static NEXT_ID: AtomicU32 = AtomicU32::new(0);
    NEXT_ID.fetch_add(1, Relaxed)
}
```
我们简单地跟踪下一个要分发的数字，并在每次加载时递增它。第一个调用者将得到 0，第二个得到 1，依此类推。

这里唯一的问题是溢出时的环绕行为。第 4,294,967,296 次调用将使 32 位整数溢出，使得下一次调用再次返回 0。

这是否是一个问题取决于用例：被调用这么多次的可能性有多大？如果数字不唯一，最坏的情况是什么？虽然这看起来是一个巨大的数字，但现代计算机可以在几秒钟内轻松执行我们的函数这么多次。如果内存安全性依赖于这些数字的唯一性，我们上面的实现是不可接受的。

为了解决这个问题，我们可以尝试在函数被调用太多次时使其恐慌（panic），如下所示：
```rust
// 这个版本有问题。
fn allocate_new_id() -> u32 {
    static NEXT_ID: AtomicU32 = AtomicU32::new(0);
    let id = NEXT_ID.fetch_add(1, Relaxed);
    assert!(id < 1000, "too many IDs!");
    id
}
```
现在，断言语句将在调用一千次后恐慌。然而，这发生在原子加法操作已经发生之后，意味着当我们恐慌时 `NEXT_ID` 已经被递增到 1001。如果另一个线程随后调用该函数，它会在恐慌之前将其递增到 1002，依此类推。尽管可能需要长得多的时间，但当 `NEXT_ID` 再次溢出到零时，我们将在 4,294,966,296 次恐慌后遇到同样的问题。

这个问题有三种常见的解决方案。第一种是不恐慌，而是在溢出时完全中止进程。`std::process::abort` 函数将中止整个进程，排除了任何事物继续调用我们函数的可能性。虽然中止进程可能需要短暂的时间，在此期间函数仍然可以被其他线程调用，但在程序真正中止之前发生数十亿次调用的机会微乎其微。

事实上，标准库中 `Arc::clone()` 的溢出检查就是这样实现的，以防你以某种方式设法克隆它 `isize::MAX` 次。在 64 位计算机上这需要数百年，但如果 `isize` 只有 32 位，则可以在几秒钟内实现。

第二种处理溢出的方法是在恐慌之前使用 `fetch_sub` 再次递减计数器，如下所示：
```rust
fn allocate_new_id() -> u32 {
    static NEXT_ID: AtomicU32 = AtomicU32::new(0);
    let id = NEXT_ID.fetch_add(1, Relaxed);
    if id >= 1000 {
        NEXT_ID.fetch_sub(1, Relaxed);
        panic!("too many IDs!");
    }
    id
}
```
当多个线程同时执行此函数时，计数器仍有可能非常短暂地递增超过 1000，但它受到活动线程数量的限制。可以合理地假设永远不会同时有数十亿个活动线程，尤其是在 `fetch_add` 和 `fetch_sub` 之间的短暂瞬间同时执行同一函数。

这就是标准库 `thread::scope` 实现中处理运行线程数溢出的方式。

第三种处理溢出的方法可以说是唯一真正正确的方法，因为它可以防止在会发生溢出时进行加法操作。然而，我们无法用目前见过的原子操作来实现这一点。为此，我们将需要比较并交换（compare-and-exchange ）操作，我们将在接下来探讨。

## 比较并交换操作 （Compare-and-Exchange Operations）

最先进且灵活的原子操作是比较并交换操作。该操作检查原子值是否等于给定值，只有在这种情况下，才会用新值替换它，所有操作原子性地作为单个操作完成。它将返回先前的值，并告诉我们是否替换了它。

其函数签名比我们目前看到的要复杂一些。以 `AtomicI32` 为例，它看起来像这样：
```rust
impl AtomicI32 {
    pub fn compare_exchange(
        &self,
        expected: i32,
        new: i32,
        success_order: Ordering,
        failure_order: Ordering
    ) -> Result<i32, i32>;
}
```
暂时忽略内存排序，它基本上等同于以下实现，只不过它是作为一个单一的、不可分割的原子操作发生的：
```rust
impl AtomicI32 {
    pub fn compare_exchange(&self, expected: i32, new: i32) -> Result<i32, i32> {
        // 实际上，加载、比较和存储都是作为一个原子操作发生的。
        let v = self.load();
        if v == expected {
            // 值符合预期。
            // 替换它并报告成功。
            self.store(new);
            Ok(v)
        } else {
            // 值不符合预期。
            // 保持原样并报告失败。
            Err(v)
        }
    }
}
```
使用这个操作，我们可以从原子变量加载一个值，执行我们喜欢的任何计算，然后只有当原子变量在此期间没有改变时，才存储新计算的值。如果我们把它放在一个循环中，以便在它确实改变时重试，我们可以用这个操作来实现所有其他原子操作，使其成为最通用的操作。

为了演示，让我们在不使用 `fetch_add` 的情况下，将 `AtomicU32` 递增1，只是为了看看如何在实践中使用 `compare_exchange`：
```rust
fn increment(a: &AtomicU32) {
    let mut current = a.load(Relaxed); // 1
    loop {
        let new = current + 1; // 2
        match a.compare_exchange(current, new, Relaxed, Relaxed) { // 3
            Ok(_) => return, // 4
            Err(v) => current = v, // 5
        }
    }
}
```
1. 首先，我们加载 `a` 的当前值。

2. 我们计算想要存储在 `a` 中的新值，而不考虑其他线程可能同时修改 `a`。
3. 我们使用 `compare_exchange` 来更新 `a` 的值，但前提是它的值仍然是我们之前加载的值。
4. 如果 `a` 确实和之前一样，那么它现在被我们的新值替换，我们就完成了。
5. 如果 `a` 和之前不一样，那么另一个线程一定在我们加载它之后的短暂瞬间改变了它。`compare_exchange` 操作给出了 `a` 改变后的值，我们将使用该值再次尝试。加载和更新之间的短暂瞬间非常短，以至于循环不太可能超过几次迭代。

> 如果原子变量在加载操作之后，但在 `compare_exchange` 操作之前，从某个值 A 变为 B，然后又变回 A，那么操作仍然会成功，即使原子变量在此期间发生了变化（并且又变了回来）。在许多情况下，就像我们的递增示例一样，这不是问题。然而，某些算法，通常涉及原子指针，可能会因此出现问题。这被称为 ABA 问题。

除了 `compare_exchange`，还有一个类似的方法叫做 `compare_exchange_weak`。区别在于，弱版本有时即使原子值与期望值匹配，也可能保持值不变并返回 `Err`。在某些平台上，这种方法可以实现得更高效，并且在虚假的比较并交换失败后果不严重的情况下，应该优先使用它，例如我们上面的递增函数。在第七章中，我们将深入底层细节，以了解为什么弱版本可能更高效。

### 示例：无溢出的 ID 分配 （Example: ID Allocation Without Overflow）

现在，回到我们["示例：ID 分配"](chapter2#示例id-分配-example-id-allocation)中 `allocate_new_id()` 的溢出问题。

为了防止溢出，我们可以使用 `compare_exchange` 来实现带有上限的原子加法。基于这个想法，让我们制作一个始终正确处理溢出的 `allocate_new_id` 版本，即使在几乎不可能的情况下：
```rust
fn allocate_new_id() -> u32 {
    static NEXT_ID: AtomicU32 = AtomicU32::new(0);
    let mut id = NEXT_ID.load(Relaxed);
    loop {
        assert!(id < 1000, "too many IDs!");
        match NEXT_ID.compare_exchange_weak(id, id + 1, Relaxed, Relaxed) {
            Ok(_) => return id,
            Err(v) => id = v,
        }
    }
}
```
现在，我们在修改 `NEXT_ID` 之前进行检查和恐慌，保证它永远不会递增超过 1000，从而不可能溢出。如果我们愿意，现在可以将上限从 1000 提高到 `u32::MAX`，而不必担心可能超过限制的边缘情况。

>获取更新 Fetch-Update
>
原子类型有一个方便的方法叫做 `fetch_update`，用于处理比较并交换循环模式。它等同于一个加载操作，然后是一个重复计算和 `compare_exchange_weak` 的循环，就像我们上面做的那样。使用它，我们可以用一行代码实现我们的 `allocate_new_id` 函数：
>```rust
>NEXT_ID.fetch_update(Relaxed, Relaxed, |n| >n.checked_add(1)).expect("too many IDs!")
>```
请查看该方法的文档以获取详细信息。
>
>我们不会在本书中使用 `fetch_update` 方法，以便专注于单个原子操作。

### 示例：惰性一次性初始化 （Example: Lazy One-Time Initialization）

在["示例：惰性初始化"](chapter2#示例惰性初始化example-lazy-initialization)中，我们看了一个常量值惰性初始化的例子。我们创建了一个函数，在第一次调用时惰性地初始化一个值，但在后续调用中重用该值。当多个线程在第一次调用期间并发运行该函数时，可能有多个线程执行初始化，它们将以不可预测的顺序覆盖彼此的结果。

对于我们期望为常量的值，或者当我们不关心值的变化时，这是可以的。然而，也有一些用例，其中这样的值每次都会初始化为不同的值，即使我们需要在程序的单次运行中，该函数的每次调用都返回相同的值。

例如，想象一个函数 `get_key()`，它返回一个随机生成的密钥，该密钥仅在程序每次运行时生成一次。它可能是用于与程序通信的加密密钥，每次程序运行时都需要是唯一的，但在进程内保持不变。

这意味着我们不能在生成密钥后简单地使用存储操作，因为这可能会覆盖另一个线程刚刚生成的密钥，导致两个线程使用不同的密钥。相反，我们可以使用 `compare_exchange` 来确保只有在没有其他线程已经存储密钥时才存储我们的密钥，否则丢弃我们的密钥并使用已存储的密钥。

以下是这个想法的实现：
```rust
fn get_key() -> u64 {
    static KEY: AtomicU64 = AtomicU64::new(0);
    let key = KEY.load(Relaxed);
    if key == 0 {
        let new_key = generate_random_key();
        match KEY.compare_exchange(0, new_key, Relaxed, Relaxed) {
            Ok(_) => new_key,
            Err(k) => k,
        }
    } else {
        key
    }
}
```
如果 `KEY` 尚未初始化，我们才生成一个新密钥。
我们仅当 `KEY` 仍为零时，才将其替换为我们新生成的密钥。
如果我们成功将零替换为新密钥，则返回我们新生成的密钥。新调用 `get_key()` 将返回现在存储在 `KEY` 中的相同新密钥。
如果我们输给了另一个在我们之前初始化了 `KEY` 的线程，我们将忘记我们新生成的密钥，转而使用 `KEY` 中的密钥。

这是一个很好的例子，说明在这种情况下 `compare_exchange` 比其弱变体更合适。我们没有在循环中运行比较并交换操作，并且我们不希望操作虚假失败时返回零。

如["示例：惰性初始化"](chapter2#示例惰性初始化example-lazy-initialization)中所述，如果 `generate_random_key()` 花费大量时间，那么在初始化期间阻塞线程可能更有意义，以避免可能花费时间生成不会被使用的密钥。Rust 标准库通过 `std::sync::Once` 和 `std::sync::OnceLock` 提供了这样的功能。

## 总结 （Summary）

- 原子操作是不可分割的；它们要么完全完成，要么尚未发生。
- Rust 中的原子操作通过 `std::sync::atomic` 中的原子类型完成，例如 `AtomicI32`。
- 并非所有原子类型在所有平台上都可用。
- 当涉及多个变量时，原子操作的相对顺序是棘手的。更多内容见第 3 章。
- 简单的加载和存储适用于非常基本的线程间通信，如停止标志和状态报告。
- 惰性初始化可以作为竞争完成，而不会导致数据竞争。
- 取改操作允许一小部分基本的原子修改，当多个线程修改同一个原子变量时特别有用。
- 原子加法和减法在溢出时静默环绕。
- 比较并交换操作是最灵活和通用的，是构建任何其他原子操作的基石。
- 弱比较并交换操作可能稍微更高效。
