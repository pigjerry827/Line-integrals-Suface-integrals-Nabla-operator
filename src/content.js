export const chapters = [
  {
    id: 'intro',
    num: '00',
    kicker: '序章 · PROLOGUE',
    short: '序',
    title: '无限细分',
    subtitle: '把弯曲的世界，切成无穷多个小块',
    human:
      '积分不是“算面积”的魔法，而是一种极有耐心的加法：把一条弯线剪成无数小段，把一张曲面切成无数小片，再把每一小份的贡献加起来。',
    rigorous:
      '积分是把局部信息聚合成整体量的极限过程。曲线、曲面与区域分别提供一维、二维、三维的“小份”，被积函数决定每一小份贡献多少。',
    formula: '\\int_{\\partial\\Omega}\\omega=\\int_{\\Omega}d\\omega',
    formulaNote: '广义斯托克斯公式：左边量边界，右边量内部。它是后面所有公式的共同祖先。',
    physics:
      '从铁丝的质量，到水流穿过渔网的通量，再到电场与涡旋，积分让我们用“局部的小东西”精确描述“整体的大东西”。',
    trap: '别急着背公式。先问自己：我在加的是长度、面积、体积，还是“穿过去的流量”？',
    stage: 'INFINITE SUBDIVISION',
    legend: [
      { color: '#38e8ff', label: '场', type: 'line' },
      { color: '#ffb454', label: '采样点', type: 'dot' },
      { color: '#9a7bff', label: '小份相加', type: 'line' },
    ],
  },
  {
    id: 'line-scalar',
    num: '01',
    kicker: '第一章 · LINE INTEGRAL I',
    short: '弧长',
    title: '一根弯铁丝的重量',
    subtitle: '第一类曲线积分 · 对弧长',
    human:
      '想象你有一根被扭成麻花的铁丝，每一段的粗细、温度或密度都不一样。想知道它有多重，就把铁丝剪成许多小段：每小段长度 <span class="hl">ds</span> 乘以那一点的密度 <span class="hl">f</span>，再把所有小份加起来。',
    rigorous:
      '设 L 为光滑曲线，f 在 L 上有定义。把 L 分成 n 个小弧段，第 i 段弧长为 Δsᵢ，任取 Pᵢ∈Δsᵢ。若 Σ f(Pᵢ)Δsᵢ 的极限存在，就称为 f 沿 L 的第一类曲线积分。',
    formula: '\\int_L f(x,y,z)\\,ds=\\lim_{n\\to\\infty}\\sum_{i=1}^{n} f(P_i)\\,\\Delta s_i',
    formulaNote: '<b>ds</b> 是一小段弧长；<b>f</b> 是那一点的密度。长度永远是正的。',
    physics:
      '质量、重心、转动惯量、线电荷总量，都是这种“沿曲线称重”的积分。它不关心你从哪头开始走。',
    trap: '把路径反向，结果不变。因为每一小段长度 ds 永远取正，和行走方向无关。',
    stage: 'WEIGHING A WIRE',
    legend: [
      { color: '#ffb454', label: '密度 f', type: 'line' },
      { color: '#38e8ff', label: '采样点', type: 'dot' },
      { color: '#5ff2b6', label: '弧长微元 ds', type: 'line' },
    ],
  },
  {
    id: 'line-vector',
    num: '02',
    kicker: '第二章 · LINE INTEGRAL II',
    short: '做功',
    title: '推箱子走弯路',
    subtitle: '第二类曲线积分 · 对坐标 / 做功',
    human:
      '你推着一个箱子沿弯曲小路走，力 <span class="hl-c">F</span> 和路的方向不一定一致。只有沿着路方向的那部分力在真正做功。把路切成小段 <span class="hl-c">dr</span>，力和 dr 点乘，再把每一小段的功加起来。',
    rigorous:
      '设 L 为有向光滑曲线，F 为向量场。记单位切向量为 T，则第二类曲线积分为 ∫_L F·dr = ∫_L P dx + Q dy + R dz = ∫_L F·T ds。',
    formula: '\\int_L \\mathbf{F}\\cdot d\\mathbf{r}=\\int_L P\\,dx+Q\\,dy+R\\,dz',
    formulaNote: '点乘就是在问：<b>力有多少成分真的沿着路？</b>',
    physics:
      '做功、环流、沿路径累积的物理量。方向反过来，dr 反向，整个积分变号。',
    trap: '第二类曲线积分与方向有关：反向走，结果变号。它还会依赖路径，除非场是保守场。',
    stage: 'WORK ALONG A PATH',
    legend: [
      { color: '#38e8ff', label: '力场 F', type: 'line' },
      { color: '#ffb454', label: '切向分量', type: 'line' },
      { color: '#ff5c8a', label: '法向分量（不做功）', type: 'line' },
    ],
  },
  {
    id: 'surface-scalar',
    num: '03',
    kicker: '第三章 · SURFACE INTEGRAL I',
    short: '面积',
    title: '给曲面刷一层漆',
    subtitle: '第一类曲面积分 · 对面积',
    human:
      '一块弯曲的铁皮，每一小块的单位面积重量不一样。把它切成许多小片，每片面积 <span class="hl">dS</span> 乘以那一点的密度 <span class="hl">f</span>，再加起来。它不关心你把铁皮翻到哪一面，因为面积不会变成负数。',
    rigorous:
      '把曲面 Σ 分成 n 个小片，第 i 片面积为 ΔSᵢ，任取 Pᵢ∈ΔSᵢ。若 Σ f(Pᵢ)ΔSᵢ 的极限存在，就称为 f 在 Σ 上的第一类曲面积分。',
    formula: '\\iint_{\\Sigma} f(x,y,z)\\,dS=\\lim_{n\\to\\infty}\\sum_{i=1}^{n} f(P_i)\\,\\Delta S_i',
    formulaNote: '<b>dS</b> 是一小片面积；<b>f</b> 是那一点的面密度。',
    physics: '曲面质量、面电荷、薄壳重心、漆料用量。曲面怎么翻，总面积和总质量都不变。',
    trap: '第一类曲面积分与曲面的正反面选择无关。若题目给了“上侧/下侧”，那通常已经在暗示第二类曲面积分。',
    stage: 'PAINTING A SURFACE',
    legend: [
      { color: '#ffb454', label: '面密度 f', type: 'line' },
      { color: '#38e8ff', label: '面积微元 dS', type: 'line' },
      { color: '#5ff2b6', label: '采样小片', type: 'dot' },
    ],
  },
  {
    id: 'surface-vector',
    num: '04',
    kicker: '第四章 · SURFACE INTEGRAL II',
    short: '通量',
    title: '数一数穿过渔网的水',
    subtitle: '第二类曲面积分 · 通量',
    human:
      '把渔网斜着放进水里，想知道每秒有多少水穿过它。把网分成小片，每片看法向量 <span class="hl-c">n</span> 和水流 <span class="hl-c">F</span> 的夹角：真正穿过去的是 F 在 n 方向的分量，再乘以面积。翻个面，法向量反过来，流量就变号。',
    rigorous:
      '设 Σ 为有向曲面，n 为单位法向量，则第二类曲面积分（通量）为 ∬_Σ F·n dS，也可写成 ∬ P dy dz + Q dz dx + R dx dy。',
    formula: '\\iint_{\\Sigma}\\mathbf{F}\\cdot\\mathbf{n}\\,dS=\\iint_{\\Sigma}P\\,dy\\,dz+Q\\,dz\\,dx+R\\,dx\\,dy',
    formulaNote: '<b>n</b> 是单位法向量；<b>F·n</b> 是“穿过”的强度，可正可负。',
    physics: '电通量、磁通量、流体通量、热流。它回答的是“每秒净穿过多少”。',
    trap: '第二类曲面积分与定向有关：翻面，法向反向，结果变号。闭合曲面通常统一取外法向。',
    stage: 'FLUX THROUGH A NET',
    legend: [
      { color: '#38e8ff', label: '流出（正通量）', type: 'line' },
      { color: '#ff8a4c', label: '流入（负通量）', type: 'line' },
      { color: '#ffb454', label: '法向量 n', type: 'line' },
    ],
  },
  {
    id: 'green',
    num: '05',
    kicker: '第五章 · GREEN',
    short: 'Green',
    title: '大圈与小漩涡',
    subtitle: '格林公式 · 平面上的边界与内部',
    human:
      '在一个平面区域里，每个小方块都有自己的“小旋转”。沿着最外圈边界逆时针走一圈量到的总环流，正好等于里面所有小旋转的总和。内部相邻的边一正一反，<span class="hl">全部抵消</span>，只剩外圈。',
    rigorous:
      '设 D 是由分段光滑闭曲线 ∂D 围成的平面区域，P、Q 在 D 上有一阶连续偏导，边界取正向（区域在左手边），则 ∮_∂D P dx + Q dy = ∬_D (∂Q/∂x − ∂P/∂y) dA。',
    formula: '\\oint_{\\partial D} P\\,dx+Q\\,dy=\\iint_{D}\\left(\\frac{\\partial Q}{\\partial x}-\\frac{\\partial P}{\\partial y}\\right)dA',
    formulaNote: '括号里的 <b>∂Q/∂x − ∂P/∂y</b> 就是二维旋度：每单位面积的小旋转强度。',
    physics:
      '浴缸里无数小水团都在转。沿着浴缸边缘量一圈的总旋转，等于内部所有小水团涡量之和。大圈的故事，全写在小漩涡里。',
    trap: '边界必须取正向：沿边界行走时，区域始终在你的左手边。取反方向，两边同时变号。',
    stage: 'CIRCULATION & VORTICITY',
    legend: [
      { color: '#38e8ff', label: '边界环流', type: 'line' },
      { color: '#9a7bff', label: '小漩涡（旋度）', type: 'ring' },
      { color: '#ffb454', label: '内部边抵消', type: 'line' },
    ],
  },
  {
    id: 'stokes',
    num: '06',
    kicker: '第六章 · STOKES',
    short: 'Stokes',
    title: '曲面的边缘',
    subtitle: '斯托克斯公式 · 从平面升到三维',
    human:
      '格林公式升到三维：沿着曲面的边缘走一圈，量到的环流，等于曲面上每一个小块的旋度沿法向加起来。曲面是平的还是鼓起来的都无所谓，只要<span class="hl">边缘相同</span>，结果就相同。',
    rigorous:
      '设 S 为分片光滑的有向曲面，边界 ∂S 的定向与 S 的单位法向量 n 满足右手定则，F 有一阶连续偏导，则 ∮_∂S F·dr = ∬_S (∇×F)·n dS。',
    formula: '\\oint_{\\partial S}\\mathbf{F}\\cdot d\\mathbf{r}=\\iint_{S}(\\nabla\\times\\mathbf{F})\\cdot\\mathbf{n}\\,dS',
    formulaNote: '旋度通量 = 边界环流。曲面可以任意鼓起，只要边界不变。',
    physics:
      '风场中的风筝、机翼上的环流：边缘的总旋转，等于面上涡量（小漩涡）的通量。涡量像一根根穿过曲面的细管。',
    trap: '曲面定向与边界方向必须满足右手定则，否则会差一个负号。换一张同边界的曲面，结果不变。',
    stage: 'BOUNDARY & VORTICITY',
    legend: [
      { color: '#38e8ff', label: '边界环流', type: 'line' },
      { color: '#9a7bff', label: '旋度 / 涡管', type: 'line' },
      { color: '#ffb454', label: '曲面法向 n', type: 'line' },
    ],
  },
  {
    id: 'gauss',
    num: '07',
    kicker: '第七章 · GAUSS',
    short: 'Gauss',
    title: '袋子里的水龙头',
    subtitle: '高斯公式 · 闭合曲面与内部源',
    human:
      '一个封闭袋子里到处是水龙头和下水道。袋子里总共“造”了多少水，袋子表面就净流出多少水。把内部每一点的散度（源强）加起来，等于穿过整个表面的通量。',
    rigorous:
      '设 V 是由分片光滑闭合曲面 ∂V 围成的空间区域，n 取外法向，F 有连续偏导，则 ∬_∂V F·n dS = ∭_V ∇·F dV。',
    formula: '\\iint_{\\partial V}\\mathbf{F}\\cdot\\mathbf{n}\\,dS=\\iiint_{V}\\nabla\\cdot\\mathbf{F}\\,dV',
    formulaNote: '<b>∇·F</b> 是每单位体积的净流出量；闭合曲面必须取外法向。',
    physics:
      '封闭房间里的热源、电场中的电荷、流体中的源和汇。表面上的净流量，替你把内部所有源头的账一次算清。',
    trap: '必须是闭合曲面，并且取外法向。内部有“下水道”时通量可以为负；曲面不闭合时不能直接用高斯公式。',
    stage: 'SOURCES & FLUX',
    legend: [
      { color: '#38e8ff', label: '外法向 / 通量', type: 'line' },
      { color: '#ff5c8a', label: '源（div > 0）', type: 'dot' },
      { color: '#5ff2b6', label: '汇（div < 0）', type: 'dot' },
    ],
  },
  {
    id: 'operators',
    num: '08',
    kicker: '第八章 · OPERATORS',
    short: '∇·×',
    title: '三把手术刀',
    subtitle: '梯度 · 散度 · 旋度',
    human:
      '梯度告诉你“往哪走上升最快”；散度告诉你“这里是水龙头还是下水道”；旋度告诉你“放在这里的小风车转得多快”。它们分别把标量场、向量场的局部变化，翻译成三种直觉。',
    rigorous:
      '梯度 ∇f 把标量场变成向量场；散度 ∇·F 把向量场变成标量场，度量单位体积净流出；旋度 ∇×F 把向量场变成向量场，度量局部环流。',
    formula: '\\nabla f,\\qquad \\nabla\\cdot\\mathbf{F},\\qquad \\nabla\\times\\mathbf{F}',
    formulaNote: '三个算子都只关心“某一点附近”发生了什么。点选舞台上的探针即可查看局部读数。',
    physics:
      '梯度：温度变化最猛的方向；散度：单位体积的净流出量；旋度：单位面积的环流强度。',
    trap: '梯度作用于标量场；散度和旋度作用于向量场。别把 ∇·F（散度，标量）和 ∇×F（旋度，向量）混在一起。',
    stage: 'THE OPERATOR BENCH',
    legend: [
      { color: '#5ff2b6', label: '梯度 ∇f', type: 'line' },
      { color: '#ff5c8a', label: '散度 ∇·F', type: 'dot' },
      { color: '#9a7bff', label: '旋度 ∇×F', type: 'ring' },
    ],
  },
  {
    id: 'summary',
    num: '09',
    kicker: '终章 · THE BIG PICTURE',
    short: '总览',
    title: '边界即内部',
    subtitle: '一张图看懂三大公式',
    human:
      '曲线积分、曲面积分是“怎么加”；Green、Stokes、Gauss 是“边界上的加法，可以换成立体内部的加法”。它们都是微积分基本定理在更高维度的化身。',
    rigorous:
      '广义斯托克斯定理 ∫_∂Ω ω = ∫_Ω dω 统一了 Green、Stokes、Gauss：微分形式 ω 在边界上的积分，等于其外微分 dω 在内部区域上的积分。',
    formula: '\\int_{\\partial\\Omega}\\omega=\\int_{\\Omega}d\\omega',
    formulaNote: '左边量边界，右边量内部。导数 d 把“边界信息”翻译成“内部密度”。',
    physics:
      '这就是场论的心脏：想知道一个区域内部发生了什么，有时只要在它的边界上量一圈。',
    trap: '三者的区别只在“舞台”的维度：平面区域、三维曲面、三维体积。核心句式完全相同。',
    stage: 'BOUNDARY IS THE INSIDE',
    legend: [
      { color: '#38e8ff', label: '边界 ∂Ω', type: 'ring' },
      { color: '#9a7bff', label: '内部 Ω', type: 'line' },
      { color: '#ffb454', label: '导数 d', type: 'dot' },
    ],
    extra: `
      <div class="card-label"><i class="label-dot label-gold"></i>四类积分对照</div>
      <table class="compare-table">
        <thead><tr><th>类型</th><th>加什么</th><th>方向</th><th>典型物理量</th></tr></thead>
        <tbody>
          <tr><td class="c-gold">第一类曲线</td><td>f·ds</td><td>无关</td><td>弯铁丝质量</td></tr>
          <tr><td class="c-cyan">第二类曲线</td><td>F·dr</td><td>反向变号</td><td>做功、环流</td></tr>
          <tr><td class="c-gold">第一类曲面</td><td>f·dS</td><td>无关</td><td>曲面质量、电荷</td></tr>
          <tr><td class="c-cyan">第二类曲面</td><td>F·n dS</td><td>翻面变号</td><td>通量</td></tr>
        </tbody>
      </table>
      <div class="card-label" style="margin-top:14px"><i class="label-dot label-violet"></i>三大公式</div>
      <table class="compare-table">
        <tbody>
          <tr><td class="c-cyan">Green</td><td>平面边界环流 = 内部二维旋度之和</td></tr>
          <tr><td class="c-violet">Stokes</td><td>空间边界环流 = 曲面上的旋度通量</td></tr>
          <tr><td class="c-pink">Gauss</td><td>闭合面通量 = 内部散度之和</td></tr>
        </tbody>
      </table>
      <div class="theorem-jump">
        <button data-jump="green">回到 Green</button>
        <button data-jump="stokes">回到 Stokes</button>
        <button data-jump="gauss">回到 Gauss</button>
        <button data-jump="operators">回到三算子</button>
      </div>`,
  },
];

export const chapterIndexById = Object.fromEntries(chapters.map((c, i) => [c.id, i]));
