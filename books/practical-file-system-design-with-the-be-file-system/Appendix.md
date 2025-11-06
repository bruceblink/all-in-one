---
sidebar_position: 13
typora-root-url: ./..\..\static
---

# 附录(Appendix)

## 文件系统构建套件 (A File System Construction Kit)

### A.1 简介 (Introduction)

从头编写一个文件系统是一项艰巨的任务。其固有的难度常常阻碍人们尝试新的想法。即使修改一个现有文件系统也不容易，因为它通常需要在内核模式下运行，需要额外的磁盘和一台用于调试的备用机器。这些障碍阻止了除了最感兴趣的人之外的所有人探索文件系统。

为了更容易地探索和实验文件系统，我们设计了一个**文件系统构建套件**。该工具包在**用户级别**运行，并在**一个文件内部创建文件系统**。有了这个工具包，用户无需任何特殊权限即可运行自己的文件系统，并且可以使用常规的**源代码级调试器**轻松调试。在 BeOS 和 Unix 下，如果需要，该工具包还可以操作**原始磁盘设备**（以更密切地模拟它在“真实”情况下运行的方式）。

本附录并非文件系统构建工具包的完整文档。它提供了数据结构和工具包 API 的概述，但未提供修改它的完整细节。完整文档可在包含文件系统构建工具包的存档中找到。该存档可在 `http://www.mkp.com/giampaolo/fskit.tar.gz` 和 `ftp://mkp.com/giampaolo/fskit.tar.gz` 获取。

### A.2 概述 (Overview)

文件系统构建工具包将文件系统的功能划分为多个组件：

- **超级块 (Superblock)**
- **块分配 (Block allocation)**
- **i-node (I-nodes)**
- **日志 (Journaling)**
- **数据流 (Data streams)**
- **目录 (Directories)**
- **文件操作 (File operations)**（创建、重命名、删除）

其中**最有趣的四个组件**是：**块分配**、**i-node 分配**、**数据流管理**和**目录操作**。其目的是使每个组件都独立于其他组件。每个组件的独立性应该使得用不同的实现替换一个组件并观察其对系统其余部分的影响变得容易。**日志组件是可选的**，只有在需要时才需要填充 API。

这个文件系统构建工具包**不提供**属性或索引的挂钩。扩展工具包以支持这些操作并非特别困难，但会使基本 API 复杂化。此工具包的目的是**教学**而非商业，因此不需要冗长的功能列表。

除了核心文件系统组件外，该工具包还提供了**支持基础设施**，使文件系统可用。该框架围绕文件系统 API 封装，并呈现一个更熟悉的（即类似 POSIX 的）API，供测试工具使用。测试工具是一个程序，提供所有结构的前端。本质上，测试工具是一个 shell，允许用户发出命令来执行文件系统操作。

关于如何在文件系统中存储数据的截然不同的想法可能需要更改工具包的整体结构。即使核心文件系统概念的实现截然不同，测试工具仍应保持有用。

提供的文件系统实现是**有意简化**的。目标是使其易于理解，这意味着易于遵循的数据结构。我们希望通过使实现易于理解，它也将易于修改。

### A.3 数据结构 (The Data Structures)

这个工具包操作几种基本数据结构。以下段落简要介绍了 A.4 节中提及的数据类型。理解这些基本数据类型将有助于理解工具包函数预期如何行为。

所有例程都接受一个指向 **`fs_info` 结构体**的指针。这个结构体包含文件系统所需的所有**全局状态信息**。通常，`fs_info` 结构体将包含超级块的副本以及其他组件所需数据结构的引用。使用 `fs_info` 结构体，文件系统必须能够访问其在内存中存储的所有状态。

次重要的数据结构是 **`disk_addr`**。文件系统可以根据需要定义 `disk_addr`，因为它主要是一个不被工具包更高层看到的**内部数据结构**。`disk_addr` 可以像一个无符号整数一样简单，也可以是一个包含多个字段的完整数据结构。`disk_addr` 必须能够寻址磁盘上的任何位置。

与 `disk_addr` 相关的是 **`inode_addr`**。如果文件系统使用磁盘地址来定位 i-node（如 BFS 中所做），那么 `inode_addr` 数据类型可能与 `disk_addr` 相同。如果 `inode_addr` 是 i-node 表的索引，那么它可能只是定义为一个整数。

在这些基本数据类型的基础上，`fs_inode` 数据结构存储了 i-node 在内存中使用时所需的所有信息。使用 `fs_inode` 结构体，文件系统必须能够访问文件的所有数据以及文件的所有信息。没有 `fs_inode` 结构体，文件系统几乎无能为力。文件系统工具包不对指向文件或目录的 `fs_inode` 结构体进行区分。文件系统必须自行管理文件和目录之间的差异。

### A.4 API (The API)

工具包的每个组件的 API 都遵循一些约定。每个组件都有以下例程：

- **`create`**：`create` 例程应创建组件所需的**磁盘上数据结构**。一些组件，如文件和目录，可以随时创建。其他组件，如块映射，只能在首次创建文件系统时创建。
- **`init`**：`init` 例程应在以前创建的文件系统上**初始化对数据结构的访问**。在组件的 `init` 例程运行后，文件系统应该准备好访问数据结构及其包含或引用的任何内容。
- **`shutdown`**：`shutdown` 例程应**完成对数据结构的访问**。在 `shutdown` 例程运行后，将不再对数据结构进行访问。
- **`allocate/free`**：这些例程应**分配**和**释放**数据结构的特定实例。例如，i-node 管理代码具有分配和释放单个 i-node 的例程。

除了这种基本的 API 风格，每个组件都实现了该组件所需的额外功能。总的来说，API 与 BeOS vnode 层 API（如第 10 章所述）**非常相似**。

以下小节包含 API 的粗略原型。再次强调，这并非旨在作为实现指南，而仅仅是 API 包含内容的粗略概述。文件系统工具包存档中包含的文档包含更具体的细节。

#### 超级块 (The Superblock)

- `fs_info fs_create_super_block(dev, volname, numblocks, ...);`
- `fs_info fs_init_super_block(dev);`
- `int fs_shutdown_super_block(fs_info);`

#### 块分配 (Block Allocation)

- `int fs_create_storage_map(fs_info);`
- `int fs_init_storage_map(fs_info);`
- `void fs_shutdown_storage_map(fs_info);`
- `disk_addr fs_allocate_blocks(fs_info, hint_bnum, len, result_lenptr, flags);`
- `int fs_free_blocks(fs_info, start_block_num, len);`
- `int fs_check_blocks(fs_info, start_block_num, len, state); /* debugging */`

#### I-Node 管理 (I-Node Management)

- `int fs_create_inodes(fs_info);`
- `int fs_init_inodes(fs_info);`
- `void fs_shutdown_inodes(fs_info);`
- `fs_inode fs_allocate_inode(fs_info, fs_inode parent, mode);`
- `int fs_free_inode(bfs_info *bfs, inode_addr ia);`
- `fs_inode fs_read_inode(fs_info, inode_addr ia);`
- `int fs_write_inode(fs_info, inode_addr, fs_inode);`

#### 日志 (Journaling)

- `int fs_create_journal(fs_info);`
- `int fs_init_journal(fs_info);`
- `void fs_shutdown_journal(fs_info);`
- `j_entry fs_create_journal_entry(fs_info);`
- `int fs_write_journal_entry(fs_info, j_entry, block_addr, block);`
- `int fs_end_journal_entry(fs_info, j_entry);`

#### 数据流 (Data Streams)

- `int fs_init_data_stream(fs_info, fs_inode);`
- `int fs_read_data_stream(fs_info, fs_inode, pos, buf, len);`
- `int fs_write_data_stream(fs_info, fs_inode, pos, buf, len);`
- `int fs_set_file_size(fs_info, fs_inode, new_size);`
- `int fs_free_data_stream(fs_info, fs_inode);`

#### 目录操作 (Directory Operations)

- `int fs_create_root_dir(fs_info);`
- `int fs_make_dir(fs_info, fs_inode, name, perms);`
- `int fs_remove_dir(fs_info, fs_inode, name);`
- `int fs_opendir(fs_info, fs_inode, void **cookie);`
- `int fs_readdir(fs_info, fs_inode, void *cookie, long *num, struct dirent *buf, bufsize);`
- `int fs_closedir(fs_info, fs_inode, void *cookie);`
- `int fs_rewinddir(fs_info, fs_inode, void *cookie);`
- `int fs_free_dircookie(fs_info, fs_inode, void *cookie);`
- `int fs_dir_lookup(fs_info, fs_inode, name, vnode_id *result);`
- `int fs_dir_is_empty(fs_info, fs_inode);`

#### 文件操作 (File Operations)

- `int fs_create(fs_info, fs_inode dir, name, perms, omode, inode_addr *ia);`
- `int fs_rename(fs_info, fs_inode odir, oname, fs_inode ndir, nname);`
- `int fs_unlink(fs_info, fs_inode dir, name);`
