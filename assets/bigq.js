/* 408 计算机组成原理 · 大题演算页
 * 1) 逐步演算步进器：按 data-steps 渲染例题的每一步
 * 2) Cache 地址划分计算器
 * 3) 流水线性能计算器（含时空图）
 */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function log2int(n) {
    var x = Math.log(n) / Math.LN2;
    return Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : null;
  }
  function fmt(x, d) {
    var v = Number(x);
    if (!isFinite(v)) return "—";
    return d === 0 ? String(Math.round(v)) : v.toFixed(d).replace(/\.?0+$/, "");
  }

  /* ══════════════ 一、逐步演算数据 ══════════════ */
  var STEPS = {
    /* ── 例题 1-1：直接映射 ── */
    "cache-direct": {
      answer: "offset 5 位、index 10 位、tag 17 位；共 1024 行；总容量 1024×275 = 281600 位 = 35200 B ≈ 34.4 KB；地址 0x12345678 映射到第 691 行（0x2B3），tag = 0x2468。",
      items: [
        {
          t: "① 先求块内地址 offset",
          f: "offset = log₂(块大小) = log₂32 = 5 位",
          e: "按字节编址，一个块有 32 个字节，要用 5 位二进制区分“块内第几个字节”。offset 永远占地址的最低几位，先算它，后面才不会被挤错。"
        },
        {
          t: "② 求 Cache 行数",
          f: "行数 = 数据区容量 ÷ 块大小 = 32 KB ÷ 32 B = 1024 行 = 2¹⁰",
          e: "32 KB = 32 × 1024 B = 32768 B。注意这里用的是“数据区容量”，不含 tag、有效位；题目如果说“Cache 总容量 32 KB”，要先扣掉附加位再算行数（本题不是）。"
        },
        {
          t: "③ 直接映射：行号就是索引",
          f: "index = log₂(行数) = log₂1024 = 10 位",
          e: "直接映射不分组，主存块号对行数取模就得到行号，所以索引位数 = 行数的二进制位数。若是组相联，这里要换成 log₂(组数)。"
        },
        {
          t: "④ 求标记 tag",
          f: "tag = 地址位数 − index − offset = 32 − 10 − 5 = 17 位",
          e: "tag 是地址剩下的高位，存在 Cache 行里，访问时和地址高位比较，判断“这一行是不是我要的那个主存块”。三段加起来必须等于 32 位。"
        },
        {
          t: "⑤ 算每行的附加位",
          f: "附加位 = tag 17 + 有效位 1 + 脏位 1 = 19 位",
          e: "有效位（valid）必须有；脏位（dirty）只在写回法里有，用来标记该行被改过、替换时要写回主存。写直达法没有脏位，附加位是 18 位。"
        },
        {
          t: "⑥ 算 Cache 总容量（含标记）",
          f: "总容量 = 1024 × (32 × 8 + 19) = 1024 × 275 位 = 281600 位 = 35200 B ≈ 34.4 KB",
          e: "每行数据 32 B = 256 位，再加 19 位附加位。题目问“Cache 总容量/实际所需位数”时要加附加位；问“数据区多大”才是 32 KB。"
        },
        {
          t: "⑦ 把地址 0x12345678 拆成三段",
          f: "offset = 0x12345678 & 0x1F = 0x18 = 24\nindex = (0x12345678 >> 5) & 0x3FF = 0x2B3 = 691\ntag = 0x12345678 >> 15 = 0x2468",
          e: "二进制对齐看：0001 0010 0011 0100 | 0101 0110 0111 1000。最低 5 位 1 1000 = 0x18；再往上的 10 位 10 1011 0011 = 0x2B3；其余高位就是 tag。"
        },
        {
          t: "⑧ 回代验证，防止算错",
          f: "0x2468 << 15 = 0x12340000\n0x2B3 << 5 = 0x5660\n0x12340000 + 0x5660 + 0x18 = 0x12345678 ✓",
          e: "把三段按位拼回去，能还原原地址就说明位数没算错。考场上这 10 秒回代，比从头再算一遍更快。"
        }
      ]
    },

    /* ── 例题 1-2：4 路组相联 ── */
    "cache-set": {
      answer: "offset 6 位、index 8 位、tag 18 位；1024 行、256 组；总容量 65536 + 2560 = 68096 B = 66.5 KB；地址 0x0000A4C8 落在第 147 组（0x93），tag = 2。",
      items: [
        {
          t: "① 求块内地址 offset",
          f: "offset = log₂64 = 6 位",
          e: "块大小换了，offset 就跟着换。先把 offset 定下来，后面行数、组数都从“容量 ÷ 块大小”出发。"
        },
        {
          t: "② 求 Cache 行数",
          f: "行数 = 64 KB ÷ 64 B = 1024 行",
          e: "64 KB = 65536 B，65536 ÷ 64 = 1024。行数只由“数据区容量 ÷ 块大小”决定，和几路相联无关。"
        },
        {
          t: "③ 求组数，再求 index",
          f: "组数 = 行数 ÷ 路数 = 1024 ÷ 4 = 256 = 2⁸\nindex = log₂(组数) = 8 位",
          e: "这是组相联最容易错的一步：index 指向“组”，不是“行”。4 路共用同一个 index，组内再靠 tag 并行比较 4 次。"
        },
        {
          t: "④ 求标记 tag",
          f: "tag = 32 − 8 − 6 = 18 位",
          e: "相联度提高后 index 变短、tag 变长，这是必然的：组内要区分 4 个不同主存块，只能靠 tag 多留信息。"
        },
        {
          t: "⑤ 算每行附加位",
          f: "附加位 = tag 18 + 有效位 1 + 脏位 1 = 20 位",
          e: "4 路组相联每行都要独立保存 tag、valid、dirty，所以是“每行 20 位 × 1024 行”，不是“每组 20 位”。"
        },
        {
          t: "⑥ 算总容量",
          f: "总容量 = 64 KB + 1024 × 20 ÷ 8 B = 65536 + 2560 = 68096 B = 66.5 KB",
          e: "附加位要除以 8 换成字节。很多人直接写“64 KB + 20 位”就交卷，单位和量纲都不对。"
        },
        {
          t: "⑦ 拆分地址 0x0000A4C8",
          f: "offset = 0xA4C8 & 0x3F = 0x08 = 8\nindex = (0xA4C8 >> 6) & 0xFF = 0x93 = 147\ntag = 0xA4C8 >> 14 = 0x00002",
          e: "0xA4C8 = 1010 0100 1100 1000；低 6 位 00 1000 = 8；接着 8 位 10 010011 = 0x93；高位 10 = 2。回代：0x8000 + 0x24C0 + 8 = 0xA4C8 ✓"
        }
      ]
    },

    /* ── 例题 2-1：1K×4 → 4K×8 ── */
    "chip-1k4": {
      answer: "共 8 片：2 片并联做位扩展，4 组做字扩展；地址线 12 位，其中 A9~A0 接片内、A11A10 经 2:4 译码器产生片选；四组地址范围是 0000H~03FFH、0400H~07FFH、0800H~0BFFH、0C00H~0FFFH。",
      items: [
        {
          t: "① 先算位扩展：几片并排",
          f: "每组片数 = 目标字长 ÷ 单片字长 = 8 ÷ 4 = 2 片",
          e: "单片只有 4 位输出，要凑成 8 位，必须两片“并排”：一片接 D7~D4，另一片接 D3~D0。位扩展不增加字数，只加宽。"
        },
        {
          t: "② 再算字扩展：几组",
          f: "组数 = 目标字数 ÷ 每组字数 = 4K ÷ 1K = 4 组",
          e: "每组 2 片合起来是 1K×8，要凑 4K 个字，需要 4 组同样的结构。先位扩展、再字扩展，顺序不能反。"
        },
        {
          t: "③ 总片数",
          f: "总片数 = 2 片/组 × 4 组 = 8 片",
          e: "也可以直接算总位数：目标 4K×8 = 32768 位，单片 1K×4 = 4096 位，32768 ÷ 4096 = 8 片。两种算法互为验算。"
        },
        {
          t: "④ 分配地址线",
          f: "总地址 4K = 2¹² → 12 位 A11~A0\n片内地址 1K = 2¹⁰ → 10 位 A9~A0\n片选 2 位 → A11A10",
          e: "地址线的分配原则：低位给片内（每片内部要能寻遍所有单元），高位给片选（决定选中哪一组）。12 = 10 + 2。"
        },
        {
          t: "⑤ 画片选逻辑",
          f: "A11A10 → 2:4 译码器 → Y0~Y3\nY0 接第 0 组两片的 CS，Y1 接第 1 组，依此类推",
          e: "同一组内的两片共用一根片选（它们要同时工作，各出 4 位）；不同组不能同时选中，否则数据线冲突。"
        },
        {
          t: "⑥ 写地址范围",
          f: "第 0 组：0000H~03FFH\n第 1 组：0400H~07FFH\n第 2 组：0800H~0BFFH\n第 3 组：0C00H~0FFFH",
          e: "每组 1K = 400H 个地址。起点 = 组号 × 400H，终点 = 起点 + 3FFH。写完检查：4 组首尾相接、正好铺满 0000H~0FFFH。"
        }
      ]
    },

    /* ── 例题 2-2：2K×8 → 8K×16 ── */
    "chip-2k8": {
      answer: "共 8 片；A10~A0 接片内（2K），A12A11 经 2:4 译码器产生片选；每组两片分别接 D15~D8 和 D7~D0；地址范围 0000H~07FFH、0800H~0FFFH、1000H~17FFH、1800H~1FFFH。",
      items: [
        {
          t: "① 位扩展",
          f: "每组片数 = 16 ÷ 8 = 2 片",
          e: "目标字长 16 位，单片 8 位，两片一组：高 8 位、低 8 位各一片。"
        },
        {
          t: "② 字扩展",
          f: "组数 = 8K ÷ 2K = 4 组",
          e: "每组 2K×16，要 8K 个字，需要 4 组。总片数 = 2 × 4 = 8 片。"
        },
        {
          t: "③ 地址线分配",
          f: "总地址 8K = 2¹³ → 13 位 A12~A0\n片内 2K = 2¹¹ → 11 位 A10~A0\n片选 2 位 → A12A11",
          e: "13 = 11 + 2。按字编址时一个字就是 16 位，不需要额外的字节选择线；若题目改成按字节编址，地址线要变 14 位并加 A0 参与字节选择。"
        },
        {
          t: "④ 数据线接法",
          f: "每组第 1 片：D15~D8\n每组第 2 片：D7~D0\n两片共用地址线、共用片选",
          e: "位扩展的两片必须“同时读、同时写”，所以地址和片选完全一样，只有数据线分开。"
        },
        {
          t: "⑤ 片选译码",
          f: "A12A11 → 2:4 译码器 → 4 个片选\n00→组 0，01→组 1，10→组 2，11→组 3",
          e: "译码器输出低电平有效还是高电平有效，取决于芯片 CS 的极性；答题时写清“经 2:4 译码器产生 4 个片选”即可。"
        },
        {
          t: "⑥ 写地址范围",
          f: "组 0：0000H~07FFH\n组 1：0800H~0FFFH\n组 2：1000H~17FFH\n组 3：1800H~1FFFH",
          e: "每组 2K = 800H 个地址。起点 = 组号 × 800H。检查：最后一组终点 1FFFH，正好是 8K 空间的末尾。"
        }
      ]
    },

    /* ── 例题 3-1：ADD R1, (R2) ── */
    "dp-load": {
      answer: "取指 4 步（PC→MAR、读存→MDR、MDR→IR、PC+1）+ 取数 3 步（R2→MAR、读存→MDR、MDR→B）+ 执行 2 步（R1→A、A+B→R1），共 9 个微操作。",
      items: [
        {
          t: "① 取指：PC → MAR",
          f: "PCout, MARin",
          e: "把下一条指令的地址送上地址总线。单总线结构里，同一拍只能有一个部件输出（out），否则总线冲突。"
        },
        {
          t: "② 取指：M(MAR) → MDR",
          f: "MemR（读命令）",
          e: "主存按 MAR 中的地址读出指令，送入 MDR。这一步不需要 out 信号，因为数据是存储器“推”到 MDR 的。"
        },
        {
          t: "③ 取指：MDR → IR",
          f: "MDRout, IRin",
          e: "指令进入指令寄存器 IR，随后操作码字段送译码器。取指阶段对所有指令都一样，是公共操作。"
        },
        {
          t: "④ 取指：PC + 1 → PC",
          f: "PC+1, PCin（或 ALU 自增后写回 PC）",
          e: "最容易漏的一步！不更新 PC，下一条指令还会取到同一条。题目若按字节编址且指令长 4 B，则应是 PC+4。"
        },
        {
          t: "⑤ 取数：R2 → MAR",
          f: "R2out, MARin",
          e: "R2 里存的是操作数的地址（寄存器间接寻址）。注意：送的是 R2 的内容，不是 R2 编号。"
        },
        {
          t: "⑥ 取数：M(MAR) → MDR",
          f: "MemR（读命令）",
          e: "按地址读出操作数。若题目是 ADD R1, R2（寄存器寻址），这一步和下一步都不需要，直接进入执行。"
        },
        {
          t: "⑦ 取数：MDR → B",
          f: "MDRout, Bin",
          e: "操作数锁存到 ALU 的 B 端。单总线结构必须用 A、B 两个锁存器暂存两个操作数，因为总线一拍只能传一个。"
        },
        {
          t: "⑧ 执行：R1 → A",
          f: "R1out, Ain",
          e: "第一个操作数送入 ALU 的 A 端。第 ⑦ 步和第 ⑧ 步顺序可以互换，但都要在 ALU 运算之前完成。"
        },
        {
          t: "⑨ 执行：A + B → R1",
          f: "ALUop = ADD, ALUout, R1in",
          e: "ALU 做加法，结果经总线写回 R1，同时更新状态标志（ZF、SF、OF、CF）。写回目标由指令的 Rd 字段决定，别写错寄存器。"
        }
      ]
    },

    /* ── 例题 3-2：ST R1, X ── */
    "dp-store": {
      answer: "取指 4 步同上；执行 3 步：IR(地址字段)→MAR、R1→MDR、MDR→M(MAR)，最后一步用 MemW，没有寄存器写回。",
      items: [
        {
          t: "① 取指：PC → MAR",
          f: "PCout, MARin",
          e: "取指阶段与读数据的指令完全一样：先送指令地址。"
        },
        {
          t: "② 取指：M(MAR) → MDR",
          f: "MemR",
          e: "读出指令。注意此时是“取指令”，不是“取操作数”，同一个 MemR 在不同阶段含义不同。"
        },
        {
          t: "③ 取指：MDR → IR",
          f: "MDRout, IRin",
          e: "指令进 IR，译码后知道这是一条“存数”指令，地址字段为 X。"
        },
        {
          t: "④ 取指：PC + 1 → PC",
          f: "PC+1, PCin",
          e: "仍然要更新 PC。存数指令不改变执行顺序，PC 照常指向下一条。"
        },
        {
          t: "⑤ 执行：IR(地址字段) → MAR",
          f: "IRout, MARin",
          e: "把指令中的地址字段 X 送入 MAR。注意来源是 IR 的地址字段，不是 PC，也不是 R1。"
        },
        {
          t: "⑥ 执行：R1 → MDR",
          f: "R1out, MDRin",
          e: "要写入主存的数据先送到 MDR，由 MDR 驱动数据总线。单总线结构不能把寄存器直接连到存储器数据线。"
        },
        {
          t: "⑦ 执行：MDR → M(MAR)",
          f: "MemW（写命令）",
          e: "发出写命令，把 MDR 的内容写入 MAR 指向的单元。写操作没有“写回寄存器”，也不需要等待读数据。"
        }
      ]
    },

    /* ── 例题 4-1：等长流水线 ── */
    "pipe-equal": {
      answer: "T = (5+100−1)×2 = 208 ns；TP = 100/208 ≈ 0.481 条/ns（4.81×10⁸ 条/s）；S = 1000/208 ≈ 4.81；E = 100/104 ≈ 96.2%。",
      items: [
        {
          t: "① 确认 k 和 n",
          f: "k = 5（IF/ID/EX/MEM/WB）\nn = 100（连续指令数）\nΔt = 2 ns",
          e: "k 是流水段数，n 是指令条数，Δt 是一个时钟周期。先写清这三个量，后面所有公式都只用到它们。"
        },
        {
          t: "② 算总时间 T",
          f: "T = (k + n − 1) × Δt = (5 + 100 − 1) × 2 ns = 104 × 2 = 208 ns",
          e: "第 1 条指令要 5 拍才出结果，之后每拍完成 1 条，所以总拍数 = 5 + (100 − 1) = 104。写成 n×k 是最常见的错。"
        },
        {
          t: "③ 算顺序执行时间 T₀",
          f: "T₀ = n × k × Δt = 100 × 5 × 2 = 1000 ns",
          e: "顺序执行时每条指令独占 5 拍。加速比的分子就是它，分母是流水线的 T。"
        },
        {
          t: "④ 算加速比 S",
          f: "S = T₀ ÷ T = 1000 ÷ 208 ≈ 4.81",
          e: "理想上限是 k = 5，实际 4.81，差的那一点就是“填满/排空”的开销。n 越大越接近 5。"
        },
        {
          t: "⑤ 算吞吐率 TP",
          f: "TP = n ÷ T = 100 ÷ 208 ns ≈ 0.481 条/ns = 4.81 × 10⁸ 条/s",
          e: "吞吐率的单位必须写。若题目用 ns 给时间，得到的是“条/ns”，换算成“条/s”要乘 10⁹。"
        },
        {
          t: "⑥ 算效率 E",
          f: "E = S ÷ k = 4.81 ÷ 5 ≈ 96.2%\n或 E = n ÷ (k + n − 1) = 100 ÷ 104",
          e: "效率 = 有效时空区 ÷ 总时空区。等长流水线里它等于 n/(k+n−1)，与 Δt 无关；不等长时要用 T₀/(k×T)，见例题 4-2。"
        }
      ]
    },

    /* ── 例题 4-2：不等长流水线 ── */
    "pipe-unequal": {
      answer: "Δt = max(2,1,3,1,2) = 3 ns；T = 104×3 = 312 ns；S = 900/312 ≈ 2.88；TP = 100/312 ≈ 0.321 条/ns；E = 900/(5×312) ≈ 57.7%。",
      items: [
        {
          t: "① 流水线周期取“最长段”",
          f: "Δt = max(2, 1, 3, 1, 2) = 3 ns",
          e: "流水线被最慢的一段卡住，其他段再快也要等。取平均值是典型错误——平均值算出来的节拍在物理上不存在。"
        },
        {
          t: "② 总时间",
          f: "T = (k + n − 1) × Δt = (5 + 100 − 1) × 3 = 312 ns",
          e: "公式形状不变，只是 Δt 换成了最长段。注意每一拍里快的段会空闲等待。"
        },
        {
          t: "③ 顺序执行时间",
          f: "T₀ = (2+1+3+1+2) × 100 = 9 × 100 = 900 ns",
          e: "不等长时不能用 k×Δt 代替每条的耗时，必须把各段真实耗时相加。"
        },
        {
          t: "④ 加速比",
          f: "S = T₀ ÷ T = 900 ÷ 312 ≈ 2.88",
          e: "远低于 5，因为快的段大量空闲。想提速就要把最长的段再切分（如把 EX 拆成两级）。"
        },
        {
          t: "⑤ 吞吐率",
          f: "TP = n ÷ T = 100 ÷ 312 ≈ 0.321 条/ns",
          e: "吞吐率只取决于最慢段：每 3 ns 出一条指令。"
        },
        {
          t: "⑥ 效率",
          f: "E = T₀ ÷ (k × T) = 900 ÷ (5 × 312) = 900 ÷ 1560 ≈ 57.7%",
          e: "不等长时不能用 n/(k+n−1)。分母是“k 段 × 总时间”，分子是“真正干活的时间”。"
        }
      ]
    },

    /* ── 例题 4-3：带停顿 ── */
    "pipe-stall": {
      answer: "T = (5+6−1+2)×1 = 12 ns；TP = 6/12 = 0.5 条/ns；T₀ = 30 ns，S = 2.5。",
      items: [
        {
          t: "① 数清三个量",
          f: "k = 5\nn = 6\n停顿 = 2 拍",
          e: "停顿来自数据冒险（load-use）或结构冒险。题目一般会说“共插入几个气泡/停顿周期”，直接数。"
        },
        {
          t: "② 总拍数加上停顿",
          f: "总拍数 = (k + n − 1) + 停顿数 = (5 + 6 − 1) + 2 = 12\nT = 12 × 1 ns = 12 ns",
          e: "停顿不会改变 k 和 n，只是让流水线多走了几拍。把停顿直接加到 (k+n−1) 上，是最稳的算法。"
        },
        {
          t: "③ 顺序执行时间",
          f: "T₀ = n × k × Δt = 6 × 5 × 1 = 30 ns",
          e: "用来做加速比的分母基准。"
        },
        {
          t: "④ 加速比",
          f: "S = 30 ÷ 12 = 2.5",
          e: "若无停顿，T = 10 ns，S = 3。两次停顿吃掉了 0.5 的加速比。"
        },
        {
          t: "⑤ 吞吐率",
          f: "TP = 6 ÷ 12 = 0.5 条/ns",
          e: "相当于每 2 拍完成一条，比无停顿时的 0.6 条/ns 低。减少停顿（转发、重排指令）就是直接提吞吐。"
        }
      ]
    }
  };

  /* 渲染一个步进器 */
  function buildWork(box) {
    var key = box.getAttribute("data-steps");
    var data = STEPS[key];
    if (!data) return;

    var total = data.items.length;
    var state = 0;

    box.innerHTML =
      '<div class="bq-bar">' +
        '<span class="bq-progress">0 / ' + total + ' 步</span>' +
        '<button type="button" class="bq-btn" data-act="prev">上一步</button>' +
        '<button type="button" class="bq-btn" data-act="next">下一步 →</button>' +
        '<button type="button" class="bq-btn ghost" data-act="all">全部展开</button>' +
        '<button type="button" class="bq-btn ghost" data-act="reset">重置</button>' +
      '</div>' +
      '<div class="bq-hint">先自己在纸上写，再点「下一步」对一步。全部展开 = 直接看完整演算。</div>' +
      '<ol class="bq-list"></ol>' +
      '<div class="bq-answer" hidden><b>✅ 最终答案：</b>' + data.answer + '</div>';

    var list = box.querySelector(".bq-list");
    var answer = box.querySelector(".bq-answer");
    var hint = box.querySelector(".bq-hint");
    var prog = box.querySelector(".bq-progress");

    data.items.forEach(function (it, i) {
      var li = document.createElement("li");
      li.className = "bq-step";
      li.innerHTML =
        '<span class="bq-num">' + (i + 1) + '</span>' +
        '<div class="bq-step-body">' +
          '<div class="bq-step-title">' + it.t + '</div>' +
          '<div class="bq-formula">' + it.f.replace(/\n/g, "<br>") + '</div>' +
          '<div class="bq-explain">' + it.e + '</div>' +
        '</div>';
      list.appendChild(li);
    });

    var items = list.querySelectorAll(".bq-step");
    var prevBtn = box.querySelector('[data-act="prev"]');
    var nextBtn = box.querySelector('[data-act="next"]');

    function paint() {
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("on", i < state);
      }
      prog.textContent = state + " / " + total + " 步";
      hint.hidden = state > 0;
      answer.hidden = state < total;
      prevBtn.disabled = state === 0;
      nextBtn.disabled = state === total;
    }

    box.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      if (act === "next") state = Math.min(total, state + 1);
      else if (act === "prev") state = Math.max(0, state - 1);
      else if (act === "all") state = total;
      else if (act === "reset") state = 0;
      paint();
      if (act === "next" && state > 0) {
        items[state - 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });

    paint();
  }

  /* ══════════════ 二、Cache 地址划分计算器 ══════════════ */
  function initCacheCalc() {
    var run = $("cc-run");
    if (!run) return;
    var out = $("cc-out");

    var WAY_NAME = { "1": "直接映射", "2": "2 路组相联", "4": "4 路组相联", "8": "8 路组相联", "full": "全相联" };

    function card(label, val, sub) {
      return '<div class="res-card"><div class="r-label">' + label + '</div>' +
        '<div class="r-val">' + val + '</div><div class="r-sub">' + sub + '</div></div>';
    }

    function calc() {
      var bits = parseInt($("cc-bits").value, 10);
      var capKB = parseFloat($("cc-cap").value);
      var block = parseInt($("cc-block").value, 10);
      var ways = $("cc-ways").value;

      if (!(bits > 0) || !(capKB > 0) || !(block > 0)) {
        out.innerHTML = '<div class="lab-note bad">三个参数都要填正数。</div>';
        return;
      }

      var capB = capKB * 1024;
      if (capB % block !== 0) {
        out.innerHTML = '<div class="lab-note bad">数据区容量必须能被块大小整除（当前 ' + capB + ' B ÷ ' + block + ' B 除不尽）。</div>';
        return;
      }

      var rows = capB / block;
      var groups = ways === "full" ? 1 : rows / parseInt(ways, 10);
      var offsetBits = log2int(block);
      var indexBits = ways === "full" ? 0 : log2int(groups);
      var rowsPow = log2int(rows);

      if (offsetBits === null) {
        out.innerHTML = '<div class="lab-note bad">块大小必须是 2 的幂（如 16 / 32 / 64 B）。</div>';
        return;
      }
      if (indexBits === null) {
        out.innerHTML = '<div class="lab-note bad">组数必须是 2 的幂，请调整容量、块大小或路数。</div>';
        return;
      }

      var tagBits = bits - indexBits - offsetBits;
      if (tagBits <= 0) {
        out.innerHTML = '<div class="lab-note bad">tag 位数 ≤ 0：地址位数不够，或 Cache 容量超过了地址空间。</div>';
        return;
      }

      // 附加位按“写回法”：tag + 1 位有效 + 1 位脏位
      var extra = tagBits + 2;
      var extraB = rows * extra / 8;
      var totalB = capB + extraB;

      out.innerHTML =
        '<div class="lab-out">' +
          card("Cache 行数", rows, fmt(capKB, 1) + " KB ÷ " + block + " B" + (rowsPow !== null ? " = 2^" + rowsPow : "")) +
          card("组数", groups, ways === "full" ? "全相联：只有 1 组" : rows + " 行 ÷ " + ways + " 路") +
          card("块内地址 offset", offsetBits + " 位", "log₂" + block) +
          card("组索引 index", indexBits + " 位", ways === "full" ? "全相联无 index" : "log₂" + groups) +
          card("标记 tag", tagBits + " 位", bits + " − " + indexBits + " − " + offsetBits) +
          card("总容量（含附加）", fmt(totalB / 1024, 2) + " KB", "数据 " + fmt(totalB - extraB, 0) + " B + 附加 " + fmt(extraB, 0) + " B") +
        '</div>' +
        '<div class="lab-kv">' +
          '<b>每行附加位</b> = tag ' + tagBits + ' + 有效位 1 + 脏位 1 = ' + extra + ' 位（写回法）<br>' +
          '<b>映射方式</b>：' + WAY_NAME[ways] + '；地址 ' + bits + ' 位 = tag ' + tagBits + ' | index ' + indexBits + ' | offset ' + offsetBits + '<br>' +
          '<b>总容量</b> = ' + fmt(capKB, 1) + ' KB + ' + rows + ' × ' + extra + ' 位 ÷ 8 = ' + fmt(totalB, 0) + ' B' +
        '</div>' +
        '<div class="lab-note">口径说明：附加位按“写回法”多算 1 位脏位；若题目写直达，把脏位去掉、额外减 ' + fmt(rows / 8, 2) + ' B。</div>';
    }

    run.addEventListener("click", calc);
    // 首次进入先按默认参数算一遍，避免空白
    calc();
  }

  /* ══════════════ 三、流水线计算器 + 时空图 ══════════════ */
  function initPipeCalc() {
    var run = $("pc-run");
    if (!run) return;
    var out = $("pc-out");
    var FILL = ["#3b82f6", "#8b5cf6", "#f59e0b", "#14b8a6", "#22c55e", "#ef4444", "#0891b2", "#7c3aed"];

    function segName(j, k) {
      var base = ["IF", "ID", "EX", "MEM", "WB"];
      if (k === 5) return base[j];
      return j < base.length ? base[j] : "S" + (j + 1);
    }

    /* 画时空图：最多画 8 条指令，拍号从 1 开始 */
    function gantt(k, n, stall) {
      var m = Math.min(n, 8);
      var cols = k + m - 1 + stall;
      var cw = 34, ch = 24, left = 46, top = 24;
      var W = left + cols * cw + 14;
      var H = top + m * ch + 30;
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="流水线时空图" style="min-width:' + W + 'px">';

      // 拍号
      for (var c = 0; c < cols; c++) {
        s += '<text x="' + (left + c * cw + cw / 2) + '" y="15" text-anchor="middle" style="font-size:10px;fill:var(--ink-3);font-family:var(--mono)">' + (c + 1) + '</text>';
      }
      // 指令行
      for (var i = 0; i < m; i++) {
        var y = top + i * ch;
        s += '<text x="' + (left - 8) + '" y="' + (y + ch / 2 + 4) + '" text-anchor="end" style="font-size:11px;fill:var(--ink-2);font-family:var(--mono)">I' + (i + 1) + '</text>';
        var start = i + (i > 0 ? stall : 0);
        for (var j = 0; j < k; j++) {
          var x = left + (start + j) * cw;
          s += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (cw - 2) + '" height="' + (ch - 2) + '" rx="4" fill="' + FILL[j % FILL.length] + '"/>';
          s += '<text x="' + (x + cw / 2) + '" y="' + (y + ch / 2 + 4) + '" text-anchor="middle" style="font-size:9.5px;font-weight:700;fill:#fff">' + segName(j, k) + '</text>';
        }
      }
      // 底部拍数
      s += '<text x="' + left + '" y="' + (H - 8) + '" style="font-size:11px;fill:var(--ink-2)">共 ' + cols + ' 拍（画出前 ' + m + ' 条）';
      if (stall > 0) {
        s += '，含 ' + stall + ' 个停顿（后续指令整体右移）';
      }
      s += '</text></svg>';
      return s;
    }

    function calc() {
      var k = parseInt($("pc-k").value, 10);
      var dt = parseFloat($("pc-dt").value);
      var n = parseInt($("pc-n").value, 10);
      var stall = parseInt($("pc-stall").value, 10) || 0;

      if (!(k >= 2) || !(dt > 0) || !(n >= 1) || stall < 0) {
        out.innerHTML = '<div class="lab-note bad">段数 ≥ 2、Δt > 0、指令数 ≥ 1、停顿 ≥ 0。</div>';
        return;
      }

      var cycles = k + n - 1 + stall;
      var T = cycles * dt;
      var T0 = n * k * dt;
      var TP = n / T;
      var S = T0 / T;
      var E = S / k;

      out.innerHTML =
        '<div class="lab-out">' +
          '<div class="res-card"><div class="r-label">总周期数</div><div class="r-val">' + cycles + '</div><div class="r-sub">k + n − 1 + 停顿</div></div>' +
          '<div class="res-card"><div class="r-label">完成时间 T</div><div class="r-val">' + fmt(T, 2) + ' ns</div><div class="r-sub">' + cycles + ' × ' + dt + ' ns</div></div>' +
          '<div class="res-card"><div class="r-label">吞吐率 TP</div><div class="r-val">' + fmt(TP, 3) + '</div><div class="r-sub">条/ns = ' + fmt(TP * 1000, 1) + ' 条/μs</div></div>' +
          '<div class="res-card"><div class="r-label">加速比 S</div><div class="r-val">' + fmt(S, 2) + '</div><div class="r-sub">T₀ = ' + fmt(T0, 0) + ' ns</div></div>' +
          '<div class="res-card"><div class="r-label">效率 E</div><div class="r-val">' + fmt(E * 100, 1) + '%</div><div class="r-sub">S ÷ k</div></div>' +
        '</div>' +
        '<div class="bq-gantt">' + gantt(k, n, stall) + '</div>' +
        '<div class="lab-kv">' +
          '<b>T</b> = (k + n − 1 + 停顿) × Δt = (' + k + ' + ' + n + ' − 1 + ' + stall + ') × ' + dt + ' = ' + fmt(T, 2) + ' ns<br>' +
          '<b>T₀</b> = n × k × Δt = ' + n + ' × ' + k + ' × ' + dt + ' = ' + fmt(T0, 0) + ' ns<br>' +
          '<b>S</b> = T₀ ÷ T = ' + fmt(S, 2) + '；<b>E</b> = S ÷ k = ' + fmt(E * 100, 1) + '%' +
        '</div>';
    }

    run.addEventListener("click", calc);
    calc();
  }

  /* ══════════════ 启动 ══════════════ */
  function boot() {
    var works = document.querySelectorAll("[data-steps]");
    for (var i = 0; i < works.length; i++) buildWork(works[i]);
    initCacheCalc();
    initPipeCalc();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
