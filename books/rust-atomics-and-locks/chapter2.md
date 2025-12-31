---
sidebar_position: 5
typora-root-url: ./..\..\static
---

# 第 2 章 原子操作（Atomics）

"原子"一词源于希腊语 ἄτομος，意为不可分割，即无法被切割成更小部分的事物。在计算机科学中，它被用来描述一种不可分割的操作：要么完全完成，要么尚未发生。

如["借用与数据竞争"](chapter1#借用与数据竞争borrowing-and-data-races)一节所述，多个线程并发读取和修改同一个变量通常会导致未定义行为。然而，原子操作确实允许不同线程安全地读取和修改同一个变量。由于这种操作是不可分割的，它要么完全发生在另一个操作之前，要么完全发生在之后，从而避免了未定义行为。我们将在[第七章]()看到这在硬件层面是如何运作的。

原子操作是所有涉及多线程操作的主要构建模块。所有其他并发原语，如互斥锁和条件变量，都是使用原子操作实现的。

在 Rust 中，原子操作作为标准原子类型（位于 `std::sync::atomic` 模块中）的方法提供。它们的名称都以 `Atomic` 开头，例如 `AtomicI32` 或 `AtomicUsize`。具体可用的类型取决于硬件架构，有时也取决于操作系统，但几乎所有平台都至少提供指针大小以内的所有原子类型。

与大多数类型不同，它们允许通过共享引用（例如 `&AtomicU8`）进行修改。这得益于内部可变性，正如["内部可变性"](chapter1#内部可变性interior-mutability)一节所讨论的那样。

每个可用的原子类型都有相同的接口，包含存储和加载的方法、原子性的"取改"操作方法，以及一些更高级的"比较并交换"方法。我们将在本章剩余部分详细讨论它们。

但是，在我们深入探讨不同的原子操作之前，需要简要地提及一个称为"内存排序"的概念：

每个原子操作都接受一个 `std::sync::atomic::Ordering` 类型的参数，它决定了我们能得到关于操作相对顺序的何种保证。保证最少的、最简单的变体是 `Relaxed`（宽松排序）。`Relaxed` 仍然保证单个原子变量的一致性，但不对不同变量之间的操作相对顺序做出任何承诺。

这意味着，两个线程可能会看到对不同变量的操作以不同的顺序发生。例如，如果一个线程首先写入一个变量，然后很快地写入第二个变量，另一个线程可能会看到这些操作以相反的顺序发生。

在本章中，我们只关注那些不存在此问题的用例，并简单地随处使用 `Relaxed` 而不深入细节。我们将在[第三章]()详细讨论内存排序的所有细节以及其他可用的内存排序。

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
这次，我们使用了一个作用域线程（第5页"作用域线程"），它会自动为我们处理线程的加入（join），并且还允许我们借用局部变量。

每当后台线程处理完一个项目时，它将已处理项目的数量存储在一个 `AtomicUsize` 中。同时，主线程将该数字显示给用户以通知他们进度，大约每秒一次。一旦主线程看到所有100个项目都已处理完毕，它就退出作用域，这会隐式地加入后台线程，并通知用户所有工作都已完成。

#### **同步**（Synchronization）

一旦最后一个项目被处理完，主线程可能需要长达一整秒才能知道，这在最后会引入不必要的延迟。为了解决这个问题，我们可以使用线程停放（第24页"线程停放"），以便在有主线程可能感兴趣的新信息时，将其从睡眠中唤醒。

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
