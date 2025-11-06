---
sidebar_position: 1
typora-root-url: ./..\..\static
---

# Practical File System Design 中文翻译

## 简介

《Practical File System Design with the Be File System》是一本深入探讨文件系统设计原则与实践的经典著作。本项目旨在提供该书的中文翻译，帮助中文读者更好地理解和学习文件系统设计。

## 目标读者

- 计算机科学研究人员
- 文件系统开发者
- 对系统设计感兴趣的工程师

## 内容目录

1. ### [第 1 章：BeOS 和 BFS 简介](chapter1.md)
   - [1.1 BFS 的历史背景](chapter1#11-bfs-的历史背景history-leading-up-to-bfs)
   - [1.2 设计目标](chapter1#12-设计目标design-goals)
   - [1.3 设计约束](chapter1#13-设计约束design-constraints)
   - [1.4 小结](chapter1#14-小结summary)
2. ### [第 2 章：什么是文件系统？](chapter2.md)
   - [2.1 基础知识](chapter2#21-基础知识the-fundamentals)
   - [2.2 术语](chapter2#22-术语the-terminology)
   - [2.3 抽象](chapter2#23-抽象概念the-abstractions)
   - [2.4 基本文件系统操作](chapter2#24-基本文件系统操作basic-file-system-operations)
   - [2.5 扩展文件系统操作](chapter2#25-扩展文件系统操作extended-file-system-operations)
   - [2.6 小结](chapter2#26-小结summary)
3. ###  [第 3 章：其他文件系统](chapter3.md)
   - [3.1 BSD FFS](chapter3.md#31-bsd-ffs)
   - [3.2 Linux ext2](chapter3.md#32-linux-ext2)
   - [3.3 Macintosh HFS](chapter3.md#33-macintosh-hfs)
   - [3.4 Irix XFS](chapter3.md#34-irix-xfs)
   - [3.5 Windows NT 的 NTFS](chapter3.md#35-windows-nt-的-ntfs)
   - [3.6 小结](chapter3#36-总结-summary)
4. ### [第 4 章：BFS 的数据结构](chapter4.md)
   - [4.1 什么是磁盘？](chapter4#41-什么是磁盘what-is-a-disk)
   - [4.2 如何管理磁盘块](chapter4#42-如何管理磁盘块-how-to-manage-disk-blocks)
   - [4.3 分配组](chapter4#43-分配组allocation-groups)
   - [4.4 块运行](chapter4#44-块运行block-runs)
   - [4.5 超级块](chapter4#45-超级块-superblock)
   - [4.6 I-Node 结构](chapter4#46-i-node-结构-the-i-node-structure)
   - [4.7 I-Node 的核心：数据流](chapter4#47-i-node-的核心数据流-the-core-of-an-i-node-the-data-stream)
   - [4.8 属性](chapter4#48-属性-attributes)
   - [4.9 目录](chapter4#49-目录-directories)
   - [4.10 索引](chapter4#410-索引-indexing)
   - [4.11 小结](chapter4#411-总结-summary)
5. ### [第 5 章：属性、索引和查询](chapter5.md)
   - [5.1 属性](chapter5#51-属性-attributes)
   - [5.2 索引](chapter5#52-索引-indexing)
   - [5.3 查询](chapter5#53-查询-queries)
   - [5.4 小结](chapter5#54-总结-summary)
6. ### [第 6 章：分配策略](chapter6.md)
   - [6.1 磁盘上的数据布局](chapter6#61-你把东西放在磁盘的什么位置where-do-you-put-things-on-disk)
   - [6.2 什么是分配策略？](chapter6#62-什么是分配策略what-are-allocation-policies)
   - [6.3 物理磁盘](chapter6#63-物理磁盘-physical-disks)
   - [6.4 可布局的内容](chapter6#64-你可以布局哪些内容what-can-you-lay-out)
   - [6.5 访问类型](chapter6#65-访问类型-types-of-access)
   - [6.6 BFS 中的分配策略](chapter6#66-bfs-中的分配策略-allocation-policies-in-bfs)
   - [6.7 小结](chapter6#67-总结-summary)
7. ### [第 7 章：日志](chapter7.md)
   - [7.1 基础知识](chapter7#71-基础知识-the-basics)
   - [7.2 日志如何工作](chapter7#72-journaling-如何工作how-does-journaling-work)
   - [7.3 日志的类型](chapter7#73-journaling-的类型-types-of-journaling)
   - [7.4 日志的内容](chapter7#74-什么会被日志记录what-is-journaled)
   - [7.5 超越日志](chapter7#75-超越-journaling-beyond-journaling)
   - [7.6 成本分析](chapter7#76-代价是什么whats-the-cost)
   - [7.7 BFS 的日志实现](chapter7#77-bfs-journaling-实现-the-bfs-journaling-implementation)
   - [7.8 深入了解事务](chapter7#78-什么是事务更深入的探讨-what-are-transactionsa-deeper-look)
   - [7.9 小结](chapter7#79-总结-summary)
8. ### [第 8 章：磁盘块缓存](chapter8.md)
    - [8.1 背景](chapter8#81-背景-background)
    - [8.2 缓存的组织](chapter8#82-缓冲缓存的组织-organization-of-a-buffer-cache)
    - [8.3 缓存优化](chapter8#83-缓存优化-cache-optimizations)
    - [8.4 I/O 与缓存](chapter8#84-io-和缓存-io-and-the-cache)
    - [8.5 小结](chapter8#85-总结-summary)
9. ### [第 9 章：文件系统性能](chapter9.md)
   - [9.1 什么是性能？](chapter9#91-什么是性能what-is-performance)
   - [9.2 性能基准](chapter9#92-哪些是基准测试what-are-the-benchmarks)
   - [9.3 性能数据](chapter9#93-性能数字-performance-numbers)
   - [9.4 BFS 的性能](chapter9#94-bfs-中的性能-performance-in-bfs)
   - [9.5 小结](chapter9#95-总结-summary)
10. ### [第 10 章：Vnode 层](chapter10.md)
    - [10.1 背景](chapter10#101-背景-background)
    - [10.2 Vnode 层的概念](chapter10#102-vnode-层概念-vnode-layer-concepts)
    - [10.3 Vnode 层支持例程](chapter10#103-vnode-层支持例程-vnode-layer-support-routines)
    - [10.4 实际工作原理](chapter10#104-实际工作原理-how-it-really-works)
    - [10.5 节点监视器](chapter10#105-节点监视器-the-node-monitor)
    - [10.6 实时查询](chapter10#106-实时查询-live-queries)
    - [10.7 小结](chapter10#107-总结-summary)
11. ### [第 11 章：用户级 API](chapter11.md)
    - [11.1 POSIX API 和 C 扩展](chapter11#111-posix-api-及-c-语言扩展-the-posix-api-and-c-extensions)
    - [11.2 C++ API](chapter11#112-c-api-the-c-api)
    - [11.3 使用 API](chapter11#113-使用-api-using-the-api)
    - [11.4 小结](chapter11#114-总结-summary)
12. ### [第 12 章：测试](chapter12.md)
    - [12.1 支持工具](chapter12#121-辅助措施-the-supporting-cast)
    - [12.2 数据结构验证示例](chapter12#122-数据结构验证示例-examples-of-data-structure-verification)
    - [12.3 调试工具](chapter12#123-调试工具-debugging-tools)
    - [12.4 为调试设计的数据结构](chapter12#124-数据结构调试设计-data-structure-design-for-debugging)
    - [12.5 测试类型](chapter12#125-测试类型-types-of-tests)
    - [12.6 测试方法](chapter12#126-测试方法论-testing-methodology)
    - [12.7 小结](chapter12#127-总结-summary)

### 附录 ：[文件系统构建套件](Appendix.md)
   - [A.1 简介](Appendix#a1-简介-introduction)
   - [A.2 概述](Appendix#a2-概述-overview)
   - [A.3 数据结构](Appendix#a3-数据结构-the-data-structures)
   - [A.4 API](Appendix#a4-api-the-api)
### 参考文献：[书籍参考文献](bibliography.md)
   - [General](bibliography#general)
   - [Other File Systems](bibliography#other-file-systems)
   - [File System Organization and Performance](bibliography#file-system-organization-and-performance)
   - [Journaling](bibliography#journaling)
   - [Attributes, Indexing, and Queries](bibliography#attributes-indexing-and-queries)


## 翻译进度

- [x] 第一章：BeOS 和 BFS 简介
- [x] 第二章：什么是文件系统？
- [x] 第三章：其他文件系统
- [x] 第四章：BFS 的数据结构
- [x] 第五章：属性、索引和查询
- [x] 第六章：分配策略
- [x] 第七章：日志
- [x] 第八章：磁盘块缓存
- [x] 第九章：文件系统性能
- [x] 第十章：Vnode 层
- [x] 第十一章：用户级 API
- [x] 第十二章：测试
- [x] 附录：文件系统构建套件

## 参与贡献

我们欢迎各种形式的贡献，包括但不限于：

- 翻译新的章节
- 校对已翻译的内容
- 改进项目文档
- 报告问题或提出建议
