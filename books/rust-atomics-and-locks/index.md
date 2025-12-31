---
sidebar_position: 4
typora-root-url: ./..\..\static
---

# Rust Atomics and Locks 中文翻译

## 简介

《Rust Atomics and Locks》by Mara Bos 是一本围绕 Rust 并发底层原语（atomics、锁、内存排序、操作系统支撑等） 的实用书籍。
总体来说，它不是一本入门 Rust 的书，而是 专门针对并发和底层细节 的深度资料

## 目标读者

- 对并发和底层原理感兴趣的 Rust 程序员
- 对跨语言并发机制感兴趣的工程师
- 已经具备基本 Rust 并发经验的进阶读者

## 内容目录

### [序](foreword.md)
### [前言](preface.md)
### [第1章 : Rust 并发基础（Basics of Rust Concurrency）](chapter1.md)
  - [Rust 中的线程 （Threads in Rust）](chapter1#rust-中的线程-threads-in-rust)
  - [作用域线程（Scoped Threads）](chapter1#作用域线程scoped-threads)
  - [共享所有权与引用计数（Shared Ownership and Reference Counting）](chapter1#共享所有权与引用计数shared-ownership-and-reference-counting)
    - [静态变量（Statics）](chapter1#静态变量statics)
    - [内存泄漏（Leaking）](chapter1#内存泄漏leaking)
    - [引用计数（Reference Counting）](chapter1#引用计数reference-counting)
    - [原子引用计数（Arc）](chapter1#原子引用计数arc)
  - [借用与数据竞争（Borrowing and Data Races）](chapter1#借用与数据竞争borrowing-and-data-races)
  - [内部可变性（Interior Mutability）](chapter1#内部可变性interior-mutability)
    - [Cell](chapter1#cell) 
    - [RefCell](chapter1#refcell) 
    - [Mutex 和 RwLock](chapter1#mutex-和-rwlock) 
    - [原子类型（Atomics）](chapter1#原子类型atomics) 
    - [UnsafeCell](chapter1#unsafecell) 
  - [线程安全：Send 和 Sync (Thread Safety: Send and Sync)](chapter1#线程安全send-和-sync-thread-safety-send-and-sync)
  - [加锁：Mutex 与 RwLock（Locking: Mutexes and RwLocks）](chapter1#加锁mutex-与-rwlocklocking-mutexes-and-rwlocks)
    - [Rust 中的 Mutex](chapter1#rust-中的-mutex)
    - [锁中毒（Lock Poisoning）](chapter1#锁中毒lock-poisoning)
    - [读写锁（Reader-Writer Lock）](chapter1#读写锁reader-writer-lock)
  - [等待：线程挂起（Parking）与条件变量（Waiting: Parking and Condition Variables）](chapter1#等待线程挂起parking与条件变量waiting-parking-and-condition-variables)
    - [线程挂起（Thread Parking）](chapter1#线程挂起thread-parking)
    - [条件变量（Condition Variables）](chapter1#条件变量condition-variables)
    
### [第2章 : 原子操作（Atomics）]()
### [第3章 : 内存顺序（Memory Ordering）]()
### [第4章 : 构建我们自己的自旋锁（Building Our Own Spin Lock）]()
### [第5章 : 构建我们自己的通道（Building Our Own Channels）]()
### [第6章 : 构建我们自己的 “Arc”（Building Our Own “Arc”）]()
### [第7章 : 理解处理器（Understanding the Processor）]()
### [第8章 : 操作系统原语（Operating System Primitives）]()
### [第9章 : 构建我们自己的锁（Building Our Own Locks）]()
### [第10章 : 思路与灵感（Ideas and Inspiration）]()


## 翻译进度

- [x]

