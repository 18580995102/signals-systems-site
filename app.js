const $ = (id) => document.getElementById(id);

const state = {
  signalType: "sine",
  amp: 1.2,
  freq: 1,
  shift: 0,
  scale: 1,
  flipped: false,
  sampleRate: 10,
  reconstructMode: "samples",
  inputType: "rect",
  responseType: "exp",
  systemParam: 1,
  lessonIndex: 0,
};

const colors = {
  axis: "#b7abc9",
  grid: "#ece5f5",
  signal: "#6427a6",
  second: "#0f8b9c",
  output: "#b83f8f",
  sample: "#c28a16",
};

const signalMeta = {
  sine: {
    name: "正弦信号",
    formula: "x(t)=A sin[ωa(t-t0)]",
    note: "当前信号适合观察频率、相位和尺度变换对波形疏密的影响。",
    property: "正弦信号的频率越高，时域中振荡越密。",
    energy: "周期信号通常看功率",
  },
  cosine: {
    name: "余弦信号",
    formula: "x(t)=A cos[ωa(t-t0)]",
    note: "余弦与正弦只差相位，适合对比相位移动与频谱位置。",
    property: "余弦与正弦只差相位，频谱结构相同。",
    energy: "周期信号通常看功率",
  },
  square: {
    name: "矩形脉冲",
    formula: "x(t)=A rect[a(t-t0)/T]",
    note: "矩形脉冲越窄，频谱主瓣越宽，可观察时宽与带宽的互逆关系。",
    property: "矩形脉冲越窄，频域主瓣越宽。",
    energy: "有限时宽信号可看能量",
  },
  tri: {
    name: "三角脉冲",
    formula: "x(t)=A tri[a(t-t0)/T]",
    note: "三角脉冲可理解为两个矩形脉冲卷积，频域衰减更快。",
    property: "三角脉冲可看成两个矩形脉冲卷积的结果。",
    energy: "有限时宽信号可看能量",
  },
  step: {
    name: "单位阶跃",
    formula: "x(t)=A u[a(t-t0)]",
    note: "阶跃信号常用来测试系统从静止到稳态的过渡过程。",
    property: "阶跃信号常用来分析系统的阶跃响应。",
    energy: "非绝对可积，常看响应趋势",
  },
  exp: {
    name: "指数衰减",
    formula: "x(t)=A e^(-αa(t-t0))u(t-t0)",
    note: "指数衰减是自然响应、RC/RL 一阶系统和拉普拉斯分析中的核心波形。",
    property: "指数信号是 LTI 系统自然响应中最常见的形式。",
    energy: "衰减越快，能量越集中",
  },
  sinc: {
    name: "抽样函数",
    formula: "x(t)=A sinc[a(t-t0)]",
    note: "sinc 函数对应理想低通恢复，是抽样定理中最关键的插值核。",
    property: "sinc 函数是理想低通恢复与抽样定理中的关键波形。",
    energy: "主瓣决定主要能量分布",
  },
  impulse: {
    name: "冲激序列",
    formula: "x(t)=AΣδ[a(t-t0)-n]",
    note: "冲激序列适合理解抽样、冲激响应以及离散化建模。",
    property: "冲激可用来刻画系统冲激响应，是卷积分析的基准。",
    energy: "理想冲激用于模型描述",
  },
};

const inputNames = { rect: "矩形脉冲", step: "阶跃信号", exp: "指数输入" };
const responseNames = { exp: "一阶系统", rect: "滑动平均", osc: "衰减振荡" };

const lessons = [
  {
    tag: "第 1 讲",
    title: "什么是信号",
    caption: "信号是承载信息的函数，最常见的是随时间变化的电压、电流、声音或图像序列。",
    mode: "signal",
  },
  {
    tag: "第 2 讲",
    title: "时移、尺度与反褶",
    caption: "同一个波形经过平移、压缩、展开和反向，就能构造出复杂的输入信号。",
    mode: "transform",
  },
  {
    tag: "第 3 讲",
    title: "系统怎样改变信号",
    caption: "系统接收输入 x(t)，产生输出 y(t)。线性时不变系统是课程的主角。",
    mode: "system",
  },
  {
    tag: "第 4 讲",
    title: "卷积的直觉",
    caption: "卷积可以理解为一个波形滑过另一个波形，重叠面积决定当前输出。",
    mode: "convolution",
  },
  {
    tag: "第 5 讲",
    title: "为什么要看频域",
    caption: "傅里叶分析把复杂信号拆成不同频率，滤波、调制和带宽都在频域里更清楚。",
    mode: "frequency",
  },
  {
    tag: "第 6 讲",
    title: "抽样与恢复",
    caption: "抽样把连续信号变成离散样值；抽样率足够高，才能避免混叠并恢复原信号。",
    mode: "sampling",
  },
];

function sinc(x) {
  if (Math.abs(x) < 1e-8) return 1;
  return Math.sin(Math.PI * x) / (Math.PI * x);
}

function baseSignal(t, type = state.signalType) {
  const u = state.flipped ? -state.scale * (t - state.shift) : state.scale * (t - state.shift);
  const A = state.amp;
  const w = state.freq;
  if (type === "sine") return A * Math.sin((2 * Math.PI * w * u) / 4);
  if (type === "cosine") return A * Math.cos((2 * Math.PI * w * u) / 4);
  if (type === "square") return Math.abs(u) <= w ? A : 0;
  if (type === "tri") return Math.max(0, A * (1 - Math.abs(u) / Math.max(0.2, w)));
  if (type === "step") return u >= 0 ? A : 0;
  if (type === "exp") return u >= 0 ? A * Math.exp((-w * u) / 2) : 0;
  if (type === "sinc") return A * sinc(w * u);
  if (type === "impulse") {
    const distance = Math.abs(u - Math.round(u));
    return distance < 0.035 ? A : 0;
  }
  return 0;
}

function idealSampleSignal(t) {
  return Math.sin(2 * Math.PI * 1.2 * t) + 0.45 * Math.sin(2 * Math.PI * 2.6 * t + 0.4);
}

function drawAxes(ctx, canvas, xMin, xMax, yMin, yMax, labels = ["t", "x(t)"]) {
  const W = canvas.width;
  const H = canvas.height;
  const pad = { l: 58, r: 24, t: 26, b: 48 };
  const sx = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const sy = (y) => pad.t + (1 - (y - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.grid;
  ctx.fillStyle = "#766987";
  ctx.font = "18px Microsoft YaHei, Arial";

  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
    const px = sx(x);
    ctx.beginPath();
    ctx.moveTo(px, pad.t);
    ctx.lineTo(px, H - pad.b);
    ctx.stroke();
    if (x !== 0) ctx.fillText(String(x), px - 7, H - 18);
  }

  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
    const py = sy(y);
    ctx.beginPath();
    ctx.moveTo(pad.l, py);
    ctx.lineTo(W - pad.r, py);
    ctx.stroke();
    if (y !== 0) ctx.fillText(String(y), 18, py + 6);
  }

  ctx.strokeStyle = colors.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx(xMin), sy(0));
  ctx.lineTo(sx(xMax), sy(0));
  ctx.moveTo(sx(0), sy(yMin));
  ctx.lineTo(sx(0), sy(yMax));
  ctx.stroke();

  ctx.fillStyle = "#39264d";
  ctx.font = "20px Microsoft YaHei, Arial";
  ctx.fillText(labels[0], W - 34, sy(0) - 10);
  ctx.fillText(labels[1], sx(0) + 12, 28);
  return { sx, sy, pad };
}

function plotFunction(ctx, mapper, xMin, xMax, options) {
  const { canvas, sx, sy, color, width = 4, dashed = false } = options;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [10, 8] : []);
  ctx.beginPath();
  const N = canvas.width - 80;
  for (let i = 0; i <= N; i++) {
    const x = xMin + (i / N) * (xMax - xMin);
    const y = mapper(x);
    const px = sx(x);
    const py = sy(y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawImpulses(ctx, xs, mapper, coord, color) {
  const { sx, sy } = coord;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  xs.forEach((x) => {
    const y = mapper(x);
    ctx.beginPath();
    ctx.moveTo(sx(x), sy(0));
    ctx.lineTo(sx(x), sy(y));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx(x), sy(y), 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawMain() {
  const canvas = $("mainCanvas");
  const ctx = canvas.getContext("2d");
  const coord = drawAxes(ctx, canvas, -8, 8, -3.2, 3.2);
  const xs = [];
  for (let x = -8; x <= 8; x += 1) xs.push(x);
  if (state.signalType === "impulse") {
    drawImpulses(ctx, xs, (x) => baseSignal(x), coord, colors.signal);
  } else {
    plotFunction(ctx, (x) => baseSignal(x), -8, 8, { canvas, ...coord, color: colors.signal });
  }
}

function spectrumProfile(f) {
  const type = state.signalType;
  const k = Math.max(0.35, state.freq * state.scale);
  if (type === "sine" || type === "cosine") {
    const peak = k / 2;
    return Math.exp(-80 * (f - peak) ** 2) + Math.exp(-80 * (f + peak) ** 2);
  }
  if (type === "square") return Math.abs(sinc(f * Math.max(0.35, k)));
  if (type === "tri") return Math.abs(sinc(f * Math.max(0.35, k))) ** 2;
  if (type === "step") return 1 / (0.25 + Math.abs(f));
  if (type === "exp") return 1 / Math.sqrt((0.5 * k) ** 2 + f ** 2);
  if (type === "sinc") return Math.abs(f) <= k / 2 ? 1 : 0;
  if (type === "impulse") return 0.65 + 0.25 * Math.cos(2 * Math.PI * f);
  return 0;
}

function drawSpectrum() {
  const canvas = $("spectrumCanvas");
  const ctx = canvas.getContext("2d");
  const coord = drawAxes(ctx, canvas, -4, 4, -0.15, 1.35, ["ω", "|X(jω)|"]);
  plotFunction(ctx, (f) => Math.min(1.25, spectrumProfile(f)), -4, 4, {
    canvas,
    ...coord,
    color: colors.output,
    width: 4,
  });
}

function drawSamples(ctx, samples, coord, color) {
  const { sx, sy } = coord;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  samples.forEach(([t, y]) => {
    ctx.beginPath();
    ctx.moveTo(sx(t), sy(0));
    ctx.lineTo(sx(t), sy(y));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx(t), sy(y), 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function reconstructValue(t, samples, Ts) {
  return samples.reduce((sum, [tn, yn]) => sum + yn * sinc((t - tn) / Ts), 0);
}

function holdValue(t, samples) {
  let chosen = samples[0];
  for (const sample of samples) {
    if (sample[0] <= t) chosen = sample;
    else break;
  }
  return chosen[1];
}

function drawSampling() {
  const canvas = $("sampleCanvas");
  const ctx = canvas.getContext("2d");
  const coord = drawAxes(ctx, canvas, -2.5, 2.5, -2.2, 2.2);
  const fs = state.sampleRate;
  const Ts = 1 / fs;
  const samples = [];
  for (let t = -2.5; t <= 2.5001; t += Ts) samples.push([t, idealSampleSignal(t)]);

  plotFunction(ctx, idealSampleSignal, -2.5, 2.5, { canvas, ...coord, color: colors.second, width: 3 });
  if (state.reconstructMode === "hold") {
    plotFunction(ctx, (t) => holdValue(t, samples), -2.5, 2.5, {
      canvas,
      ...coord,
      color: colors.sample,
      width: 3,
      dashed: true,
    });
  }
  if (state.reconstructMode === "sinc") {
    plotFunction(ctx, (t) => reconstructValue(t, samples, Ts), -2.5, 2.5, {
      canvas,
      ...coord,
      color: colors.output,
      width: 3,
      dashed: true,
    });
  }
  drawSamples(ctx, samples, coord, colors.sample);

  const status = $("samplingStatus");
  const nyquist = 5.2;
  if (fs > nyquist) {
    status.className = "status good";
    status.textContent = `fs=${fs} Hz，高于 2fmax≈${nyquist.toFixed(1)} Hz，理论上可恢复。`;
  } else {
    status.className = "status warn";
    status.textContent = `fs=${fs} Hz，低于 2fmax≈${nyquist.toFixed(1)} Hz，图像中会出现混叠。`;
  }
}

function systemInput(t) {
  if (state.inputType === "rect") return t >= 0 && t <= 1.4 ? 1 : 0;
  if (state.inputType === "step") return t >= 0 ? 1 : 0;
  if (state.inputType === "exp") return t >= 0 ? Math.exp(-0.8 * t) : 0;
  return 0;
}

function impulseResponse(t) {
  const b = state.systemParam;
  if (state.responseType === "exp") return t >= 0 ? Math.exp(-b * t) : 0;
  if (state.responseType === "rect") return t >= 0 && t <= Math.max(0.3, b) ? 1 / Math.max(0.3, b) : 0;
  if (state.responseType === "osc") return t >= 0 ? Math.exp(-0.45 * b * t) * Math.sin(5 * t) : 0;
  return 0;
}

function convolution(t) {
  const dt = 0.025;
  let sum = 0;
  for (let tau = -1; tau <= 6; tau += dt) {
    sum += systemInput(tau) * impulseResponse(t - tau) * dt;
  }
  return sum;
}

function drawSystem() {
  const canvas = $("systemCanvas");
  const ctx = canvas.getContext("2d");
  const coord = drawAxes(ctx, canvas, -1, 6, -1.6, 2.2);
  plotFunction(ctx, systemInput, -1, 6, { canvas, ...coord, color: colors.second, width: 3 });
  plotFunction(ctx, impulseResponse, -1, 6, { canvas, ...coord, color: colors.signal, width: 3, dashed: true });
  plotFunction(ctx, convolution, -1, 6, { canvas, ...coord, color: colors.output, width: 4 });
}

function drawVideoGuide(time = 0) {
  const canvas = $("videoCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const lesson = lessons[state.lessonIndex];
  const phase = time / 1000;

  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#211637");
  bg.addColorStop(0.55, "#43206d");
  bg.addColorStop(1, "#161322");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let x = 70; x < W; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 60; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  const centerY = 235;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.moveTo(70, centerY);
  ctx.lineTo(W - 70, centerY);
  ctx.stroke();

  if (lesson.mode === "signal" || lesson.mode === "transform") {
    ctx.strokeStyle = "#63d5e6";
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let i = 0; i <= 760; i++) {
      const x = 120 + i;
      const t = (i / 760) * Math.PI * 6;
      const shift = lesson.mode === "transform" ? Math.sin(phase) * 70 : 0;
      const scale = lesson.mode === "transform" ? 1 + 0.35 * Math.sin(phase * 0.8) : 1;
      const y = centerY + Math.sin(t * scale - phase * 2) * 72;
      if (i === 0) ctx.moveTo(x + shift, y);
      else ctx.lineTo(x + shift, y);
    }
    ctx.stroke();
  }

  if (lesson.mode === "system") {
    drawVideoBlock(ctx, 120, 165, 210, 120, "输入 x(t)", "#0f8b9c");
    drawVideoBlock(ctx, 445, 145, 250, 160, "LTI 系统 h(t)", "#6d35bb");
    drawVideoBlock(ctx, 815, 165, 210, 120, "输出 y(t)", "#b83f8f");
    drawArrow(ctx, 340, 225, 430, 225);
    drawArrow(ctx, 705, 225, 800, 225);
  }

  if (lesson.mode === "convolution") {
    ctx.strokeStyle = "#63d5e6";
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i <= 720; i++) {
      const x = 150 + i;
      const y = centerY - Math.max(0, 90 - Math.abs(i - 260) * 1.2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const slide = 170 + ((phase * 120) % 680);
    ctx.fillStyle = "rgba(184,63,143,0.34)";
    ctx.fillRect(slide, centerY - 95, 160, 95);
    ctx.strokeStyle = "#ff8ed4";
    ctx.strokeRect(slide, centerY - 95, 160, 95);
  }

  if (lesson.mode === "frequency") {
    for (let i = 0; i < 15; i++) {
      const x = 155 + i * 55;
      const h = 40 + 140 * Math.exp(-Math.abs(i - 7) / 3) * (0.75 + 0.25 * Math.sin(phase * 2 + i));
      ctx.fillStyle = i === 7 ? "#ffca5d" : "#63d5e6";
      ctx.fillRect(x, centerY + 105 - h, 28, h);
    }
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "28px Microsoft YaHei, Arial";
    ctx.fillText("时域复杂，频域分解", 385, 130);
  }

  if (lesson.mode === "sampling") {
    ctx.strokeStyle = "#63d5e6";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i <= 760; i++) {
      const x = 120 + i;
      const y = centerY + Math.sin(i / 45 - phase) * 68;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#ffca5d";
    for (let i = 0; i < 18; i++) {
      const x = 140 + i * 48;
      const y = centerY + Math.sin((x - 120) / 45 - phase) * 68;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.84)";
  ctx.font = "22px Microsoft YaHei, Arial";
  ctx.fillText("Signal → System → Transform → Sampling", 70, 70);

  requestAnimationFrame(drawVideoGuide);
}

function drawVideoBlock(ctx, x, y, w, h, text, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "30px Microsoft YaHei, Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + h / 2 + 10);
  ctx.textAlign = "left";
}

function drawArrow(ctx, x1, y1, x2, y2) {
  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 18, y2 - 11);
  ctx.lineTo(x2 - 18, y2 + 11);
  ctx.closePath();
  ctx.fill();
}

function updateReadouts() {
  const meta = signalMeta[state.signalType];
  $("formula").textContent = meta.formula;
  $("property").textContent = meta.property;
  $("currentSignalName").textContent = meta.name;
  $("currentFormula").textContent = meta.formula;
  $("labNote").textContent = meta.note;
  $("energyHint").textContent = meta.energy;
  $("transformHint").textContent = state.flipped ? "已执行时间反褶" : "原始时域波形";

  const nyquist = 5.2;
  $("sampleMetric").textContent = `fs=${state.sampleRate} Hz`;
  $("nyquistMetric").textContent = state.sampleRate > nyquist ? "满足抽样条件" : "存在混叠风险";
  $("systemMetric").textContent = `${inputNames[state.inputType]} * ${responseNames[state.responseType]}`;

  const lesson = lessons[state.lessonIndex];
  $("videoTag").textContent = lesson.tag;
  $("videoTitle").textContent = lesson.title;
  $("videoCaption").textContent = lesson.caption;
}

function bindRange(id, key, digits = 1, suffix = "") {
  const input = $(id);
  const output = $(`${id}Value`);
  input.addEventListener("input", () => {
    state[key] = Number(input.value);
    output.textContent = `${state[key].toFixed(digits)}${suffix}`;
    drawAll();
  });
}

function bindControls() {
  $("signalType").addEventListener("change", (e) => {
    state.signalType = e.target.value;
    drawAll();
  });
  bindRange("amp", "amp");
  bindRange("freq", "freq");
  bindRange("shift", "shift");
  bindRange("scale", "scale");

  $("flipBtn").addEventListener("click", () => {
    state.flipped = !state.flipped;
    $("flipBtn").textContent = state.flipped ? "取消反褶" : "反褶";
    drawAll();
  });

  $("resetBtn").addEventListener("click", () => {
    Object.assign(state, { amp: 1.2, freq: 1, shift: 0, scale: 1, flipped: false });
    ["amp", "freq", "shift", "scale"].forEach((id) => {
      $(id).value = state[id];
      $(`${id}Value`).textContent = Number(state[id]).toFixed(1);
    });
    $("flipBtn").textContent = "反褶";
    drawAll();
  });

  $("sampleRate").addEventListener("input", (e) => {
    state.sampleRate = Number(e.target.value);
    $("sampleRateValue").textContent = `${state.sampleRate} Hz`;
    drawSampling();
    updateReadouts();
  });

  $("reconstructMode").addEventListener("change", (e) => {
    state.reconstructMode = e.target.value;
    drawSampling();
  });

  $("nyquistBtn").addEventListener("click", () => {
    state.sampleRate = 12;
    $("sampleRate").value = 12;
    $("sampleRateValue").textContent = "12 Hz";
    drawSampling();
    updateReadouts();
  });

  $("aliasBtn").addEventListener("click", () => {
    state.sampleRate = 4;
    $("sampleRate").value = 4;
    $("sampleRateValue").textContent = "4 Hz";
    drawSampling();
    updateReadouts();
  });

  $("inputType").addEventListener("change", (e) => {
    state.inputType = e.target.value;
    drawSystem();
    updateReadouts();
  });

  $("responseType").addEventListener("change", (e) => {
    state.responseType = e.target.value;
    drawSystem();
    updateReadouts();
  });

  $("systemParam").addEventListener("input", (e) => {
    state.systemParam = Number(e.target.value);
    $("systemParamValue").textContent = state.systemParam.toFixed(1);
    drawSystem();
  });

  document.querySelectorAll(".lesson-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.lessonIndex = Number(button.dataset.lesson);
      document.querySelectorAll(".lesson-btn").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      updateReadouts();
    });
  });
}

function drawAll() {
  drawMain();
  drawSpectrum();
  drawSampling();
  drawSystem();
  updateReadouts();
}

bindControls();
drawAll();
requestAnimationFrame(drawVideoGuide);
