// ============================================================
// [差分パッチ] 温度カラーマップ スケール切り替え対応
// 適用方法: 元の agitator core JS に以下の変更を加える
// ============================================================

// ────────────────────────────────────────────────────────────
// [変更1] グローバル変数宣言部（heatShowThermalMap の直下）に追加
// ────────────────────────────────────────────────────────────
// 変更前:
//   let heatShowThermalMap = false;
//
// 変更後:
let heatShowThermalMap = false;
// 'relative' : 現在の温度場 Tmin〜Tmax の相対スケール (デフォルト)
// 'absolute' : 溶液初期温度 T0 〜 熱媒体入口温度 T_in の絶対スケール
let heatColorScaleMode = 'relative';


// ────────────────────────────────────────────────────────────
// [変更2] switchMainTab / initHeatSimulation の中の
//         initEventListeners 内に以下のイベントリスナを追加
//         (既存の btn-heat-view-particles / btn-heat-view-thermal の
//          addEventListener ブロックの直後に挿入)
// ────────────────────────────────────────────────────────────
function _patchColorScaleListeners() {
    const btnRelative = document.getElementById('btn-heat-colorscale-relative');
    const btnAbsolute = document.getElementById('btn-heat-colorscale-absolute');
    if (btnRelative && btnAbsolute) {
        const updateColorScaleBtns = () => {
            if (heatColorScaleMode === 'relative') {
                btnRelative.style.background = 'var(--accent-color)';
                btnRelative.style.color      = 'var(--text-primary)';
                btnAbsolute.style.background = 'transparent';
                btnAbsolute.style.color      = 'var(--text-muted)';
            } else {
                btnAbsolute.style.background = 'var(--accent-color)';
                btnAbsolute.style.color      = 'var(--text-primary)';
                btnRelative.style.background = 'transparent';
                btnRelative.style.color      = 'var(--text-muted)';
            }
        };
        btnRelative.addEventListener('click', () => {
            heatColorScaleMode = 'relative';
            updateColorScaleBtns();
            drawHeatSimulation();
        });
        btnAbsolute.addEventListener('click', () => {
            heatColorScaleMode = 'absolute';
            updateColorScaleBtns();
            drawHeatSimulation();
        });
        updateColorScaleBtns(); // 初期状態を反映
    }
}


// ────────────────────────────────────────────────────────────
// [変更3] drawHeatSimulation() 内の tMin / tMax 計算ブロックを
//         下記に丸ごと置き換える
//
// 置き換え対象 (元コード):
// ─────────────────────────────
//     const meanTemp = isNaN(heatSimTemp) ? 20.0 : heatSimTemp;
//
//     let tMin = meanTemp - 2.0;
//     let tMax = meanTemp + 2.0;
//
//     if (T_in > meanTemp + 0.1) {
//         // 加熱
//         tMin = meanTemp - 0.5;
//         tMax = meanTemp + Math.max(1.5, (T_in - meanTemp) * 0.25);
//     } else if (T_in < meanTemp - 0.1) {
//         // 冷却
//         tMax = meanTemp + 0.5;
//         tMin = meanTemp - Math.max(1.5, (meanTemp - T_in) * 0.25);
//     }
// ─────────────────────────────
//
// 置き換え後:
// ─────────────────────────────
function _calcColorScaleRange(T_in) {
    const meanTemp = isNaN(heatSimTemp) ? 20.0 : heatSimTemp;

    let tMin, tMax;

    if (heatColorScaleMode === 'absolute') {
        // 絶対スケール: 溶液初期温度 T0 〜 熱媒体入口温度 T_in
        const T0 = config.liquidTempInit ?? 20.0;
        tMin = Math.min(T0, T_in);
        tMax = Math.max(T0, T_in);
        // 温度差がほぼゼロの場合はわずかに広げてゼロ除算を回避
        if (tMax - tMin < 0.5) {
            tMin -= 0.5;
            tMax += 0.5;
        }
    } else {
        // 相対スケール: 現在の温度場 Tmin〜Tmax (既存ロジック)
        tMin = meanTemp - 2.0;
        tMax = meanTemp + 2.0;
        if (T_in > meanTemp + 0.1) {
            tMin = meanTemp - 0.5;
            tMax = meanTemp + Math.max(1.5, (T_in - meanTemp) * 0.25);
        } else if (T_in < meanTemp - 0.1) {
            tMax = meanTemp + 0.5;
            tMin = meanTemp - Math.max(1.5, (meanTemp - T_in) * 0.25);
        }
    }
    return { tMin, tMax };
}
// ─────────────────────────────
// そして drawHeatSimulation() 内では:
//   const { tMin, tMax } = _calcColorScaleRange(T_in);
// に置き換える。


// ────────────────────────────────────────────────────────────
// [変更4] drawHeatSimulation() 内の ctx.restore() (最後の restore の前)
//         に下記のカラーバー描画コードを挿入する
// ────────────────────────────────────────────────────────────
function _drawColorBar(ctx, canvas, tMin, tMax) {
    const barW  = 12;
    const barH  = 110;
    const barX  = 14;
    const barY  = canvas.height - barH - 40;
    const steps = barH;

    // グラデーションバー (下→上 = 低温→高温)
    for (let i = 0; i < steps; i++) {
        const ratio = i / steps;          // 0 = 下(低温), 1 = 上(高温)
        const hue   = Math.round(240 - 240 * ratio);
        ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
        ctx.fillRect(barX, barY + barH - i - 1, barW, 1);
    }

    // 枠線
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // ラベル
    ctx.font         = 'bold 8px Inter, Noto Sans JP, sans-serif';
    ctx.fillStyle    = 'rgba(255,255,255,0.75)';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';

    const labelX = barX + barW + 4;

    // 上端: tMax
    ctx.fillText(`${tMax.toFixed(1)} °C`, labelX, barY + 4);
    // 中間
    const tMid = (tMin + tMax) / 2;
    ctx.fillText(`${tMid.toFixed(1)} °C`, labelX, barY + barH / 2);
    // 下端: tMin
    ctx.fillText(`${tMin.toFixed(1)} °C`, labelX, barY + barH - 4);

    // スケール種別ラベル
    ctx.fillStyle    = 'rgba(255,255,255,0.45)';
    ctx.font         = '7px Inter, Noto Sans JP, sans-serif';
    ctx.textBaseline = 'top';
    const modeLabel  = heatColorScaleMode === 'absolute' ? '絶対スケール' : '相対スケール';
    ctx.fillText(modeLabel, barX, barY + barH + 3);
}


// ────────────────────────────────────────────────────────────
// [変更5] HTML に追加するボタン（既存の伝熱シミュレータ表示切替ボタンの隣）
//
// 既存コード (例):
//   <button id="btn-heat-view-particles" ...>粒子表示</button>
//   <button id="btn-heat-view-thermal"   ...>温度コンター</button>
//
// 追加コード (その直後に挿入):
// ─────────────────────────────
// <span style="margin-left:12px; color:var(--text-muted); font-size:0.75rem;">スケール:</span>
// <button id="btn-heat-colorscale-relative"
//         style="padding:4px 10px; border-radius:6px; border:1px solid var(--border-color);
//                background:var(--accent-color); color:var(--text-primary);
//                cursor:pointer; font-size:0.75rem;">
//   相対
// </button>
// <button id="btn-heat-colorscale-absolute"
//         style="padding:4px 10px; border-radius:6px; border:1px solid var(--border-color);
//                background:transparent; color:var(--text-muted);
//                cursor:pointer; font-size:0.75rem;">
//   絶対 (T₀〜T_in)
// </button>
// ─────────────────────────────


// ════════════════════════════════════════════════════════════
// 以下は「変更後の drawHeatSimulation()」の完全版
// 元の drawHeatSimulation() をこの関数で丸ごと置き換える
// ════════════════════════════════════════════════════════════
function drawHeatSimulation() {
    const canvas = document.getElementById('heatSimCanvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    const coords = getVesselVisualCoords();
    const { cx, D_px, scale, hb, y_deepest, y_cyl, y_liquid, lx, rx } = coords;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const N_rpm = config.simSpeedSync ? (expBlocks[0]?.rows[0]?.N || 300) : config.simSpeed;

    ctx.save();
    const T_in = config.mediaTempIn;
    const mediaRatio = Math.max(0, Math.min(1, (T_in - 10) / 80));
    const mediaHue = Math.round(240 - 240 * mediaRatio);
    const jacketColor = `hsla(${mediaHue}, 85%, 55%, 0.15)`;
    const jacketBorder = `hsla(${mediaHue}, 80%, 45%, 0.4)`;

    ctx.fillStyle = jacketColor;
    ctx.strokeStyle = jacketBorder;
    ctx.lineWidth = config.jacketType === 'spiral' ? 4 : 8;

    ctx.beginPath();
    const gap_px = config.jacketType === 'spiral' ? 6 : 10;
    ctx.moveTo(lx - gap_px, y_liquid - 10);
    ctx.lineTo(lx - gap_px, y_cyl);
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        ctx.ellipse(cx, y_cyl, D_px / 2 + gap_px, hb + gap_px, 0, Math.PI, 0, true);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl, D_px / 2 + gap_px, Math.PI, 0, true);
    } else {
        ctx.lineTo(rx + gap_px, y_cyl);
    }
    ctx.lineTo(rx + gap_px, y_liquid - 10);
    ctx.stroke();
    ctx.restore();

    // ── 液面波形 ──────────────────────────────────────────────
    let vortexDepth = Math.pow(N_rpm / 600, 2) * D_px * 0.05;
    if (config.baffleActive) vortexDepth *= 0.12;
    const maxAllowedDepth = Math.max(0, (y_deepest - y_liquid) * 0.6);
    vortexDepth = Math.min(vortexDepth, maxAllowedDepth);

    const t_wave = performance.now() / 1000;
    const waveAmp = (N_rpm / 600) * (config.baffleActive ? 0.7 : 2.2);
    const waveFreq = 2.0 + (N_rpm / 300) * 5.0;

    const getLocalSurfaceY = (x_val) => {
        const u = (x_val - cx) / (D_px / 2);
        let waveOffset = 0;
        if (N_rpm > 5) {
            const w1 = Math.sin(waveFreq * t_wave - (2 * Math.PI / D_px) * (x_val - lx));
            const w2 = Math.cos(waveFreq * 1.7 * t_wave + (4 * Math.PI / D_px) * (x_val - lx));
            waveOffset = waveAmp * (w1 + 0.35 * w2);
        }
        return Math.max(y_liquid - 10, y_liquid + vortexDepth * (0.5 - u * u) + waveOffset);
    };

    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
    ctx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
        const t_step = i / steps;
        const px = lx + t_step * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineTo(rx, y_cyl);
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        ctx.ellipse(cx, y_cyl, D_px / 2, hb, 0, 0, Math.PI, false);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl, D_px / 2, 0, Math.PI, false);
    } else {
        ctx.lineTo(lx, y_cyl);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 液面ライン
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t_step = i / steps;
        const px = lx + t_step * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    if (config.jacketType === 'spiral') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        const pitch = 14;
        for (let y = y_liquid; y < y_cyl; y += pitch) {
            ctx.beginPath();
            ctx.moveTo(lx - 6, y); ctx.lineTo(lx, y);
            ctx.moveTo(rx, y);     ctx.lineTo(rx + 6, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ── [変更3] カラースケール範囲の計算 ─────────────────────
    const { tMin, tMax } = _calcColorScaleRange(T_in);

    // ── 液相領域クリップ ──────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    const steps_clip = 40;
    for (let i = 0; i <= steps_clip; i++) {
        const t_step = i / steps_clip;
        const px = lx + t_step * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineTo(rx, y_cyl);
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        ctx.ellipse(cx, y_cyl, D_px / 2, hb, 0, 0, Math.PI, false);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl, D_px / 2, 0, Math.PI, false);
    } else {
        ctx.lineTo(lx, y_cyl);
    }
    ctx.closePath();
    ctx.clip();

    if (heatShowThermalMap) {
        // ── カーネル平滑化 ＋ 時間平均 コンター表示 ─────────
        const gridCols = 45;
        const gridRows = 32;
        const w_cell = (rx - lx) / gridCols;
        const h_cell = (y_deepest - y_liquid) / gridRows;
        const meanTemp = isNaN(heatSimTemp) ? 20.0 : heatSimTemp;

        if (!thermalGridData || thermalGridData.length !== gridCols * gridRows) {
            thermalGridData = Array.from({ length: gridCols * gridRows }, () => ({
                smoothTemp: meanTemp
            }));
        }
        if (!thermalOffscreenCanvas) {
            thermalOffscreenCanvas = document.createElement('canvas');
            thermalOffscreenCanvas.width  = gridCols;
            thermalOffscreenCanvas.height = gridRows;
        }

        const offCanvas = thermalOffscreenCanvas;
        const offCtx = offCanvas.getContext('2d');
        offCtx.clearRect(0, 0, gridCols, gridRows);

        const h_smooth = 25.0;
        const h_smooth_sq = h_smooth * h_smooth;
        const props = getEffectiveProperties();
        const defaultM_Cp = 0.05 * ((props.Cp ?? 4184) * (props.rho ?? 1000) * 1.0);
        const beta = heatSimActive ? 0.85 : 0.0;

        for (let r = 0; r < gridRows; r++) {
            const yc = y_liquid + (r + 0.5) * h_cell;
            for (let c = 0; c < gridCols; c++) {
                const xc = lx + (c + 0.5) * w_cell;
                const gIdx = r * gridCols + c;
                let sum_w_mCpT = 0;
                let sum_w_mCp  = 0;

                for (let i = 0; i < heatParticles.length; i++) {
                    const p = heatParticles[i];
                    const dx = p.x - xc;
                    const dy = p.y - yc;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 6.25 * h_smooth_sq) {
                        const weight = Math.exp(-distSq / h_smooth_sq);
                        const p_m  = (p.m !== undefined && !isNaN(p.m)) ? p.m : ((p.relSize || 1.0) ** 2);
                        const p_cp = (p.cp !== undefined && !isNaN(p.cp)) ? p.cp : 4184;
                        const mCp  = p_m * p_cp;
                        const p_temp = isNaN(p.temp) ? meanTemp : p.temp;
                        sum_w_mCpT += weight * mCp * p_temp;
                        sum_w_mCp  += weight * mCp;
                    }
                }

                let rawTemp = (sum_w_mCpT + defaultM_Cp * meanTemp) / (sum_w_mCp + defaultM_Cp);
                if (isNaN(rawTemp)) rawTemp = meanTemp;

                let currentSmooth = thermalGridData[gIdx].smoothTemp;
                if (currentSmooth === undefined || isNaN(currentSmooth)) currentSmooth = meanTemp;
                let newSmooth = beta * currentSmooth + (1 - beta) * rawTemp;
                if (isNaN(newSmooth)) newSmooth = meanTemp;
                thermalGridData[gIdx].smoothTemp = newSmooth;

                // [変更3 適用] tMin/tMax を切り替え済みの値で使用
                const ratio = Math.max(0, Math.min(1, (newSmooth - tMin) / Math.max(1e-3, tMax - tMin)));
                const hue   = Math.round(240 - 240 * ratio);
                offCtx.fillStyle = `hsl(${hue}, 85%, 55%)`;
                offCtx.fillRect(c, r, 1, 1);
            }
        }

        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(offCanvas, lx, y_liquid, rx - lx, y_deepest - y_liquid);

    } else {
        // ── 熱粒子表示 ─────────────────────────────────────
        heatParticles.forEach(p => {
            // [変更3 適用]
            const ratio = Math.max(0, Math.min(1, (p.temp - tMin) / Math.max(1e-3, tMax - tMin)));
            const hue   = Math.round(240 - 240 * ratio);
            ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.8 * p.relSize, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    ctx.restore();

    // ── コイル描画 ────────────────────────────────────────────
    if (config.coilActive) {
        ctx.save();
        const coilFill     = `hsl(${mediaHue}, 80%, 48%)`;
        const coilStroke   = `hsl(${mediaHue}, 70%, 35%)`;
        const d_co_m       = config.coilOuterDia ?? 0.010;
        const D_c_real     = (config.coilCenterDia && config.coilCenterDia > 0) ? config.coilCenterDia : 0.7 * config.DT;
        const D_c_px       = D_c_real * scale;
        const coilR        = Math.max(4, (d_co_m / 2) * scale);
        const y_bot_vessel = getVesselBottomY(cx + D_c_px / 2 + coilR, coords);
        const coilSpan     = y_bot_vessel - coilR - y_liquid - 20;
        const p_c_m        = Math.max(d_co_m * 1.01, config.coilPitch ?? (2.5 * d_co_m));
        const p_c_px       = p_c_m * scale;
        const N_t          = Math.max(1, Math.floor(coilSpan / p_c_px));
        const pitch        = coilSpan / N_t;

        for (let j = 0; j < N_t; j++) {
            const cy_coil = y_liquid + 14 + j * pitch + pitch / 2;
            const cy_mid  = cy_coil + pitch / 2;

            ctx.beginPath(); ctx.ellipse(cx - D_c_px/2, cy_mid,  coilR*0.55, coilR, 0, 0, Math.PI*2);
            ctx.fillStyle = `hsl(${mediaHue}, 70%, 38%)`; ctx.fill();
            ctx.strokeStyle = coilStroke; ctx.lineWidth = 1.5; ctx.stroke();

            ctx.beginPath(); ctx.ellipse(cx + D_c_px/2, cy_coil, coilR*0.55, coilR, 0, 0, Math.PI*2);
            ctx.fillStyle = `hsl(${mediaHue}, 70%, 38%)`; ctx.fill(); ctx.stroke();

            ctx.beginPath(); ctx.strokeStyle = coilFill; ctx.lineWidth = coilR*1.1; ctx.lineCap = 'round';
            ctx.moveTo(cx + D_c_px/2, cy_coil);
            ctx.bezierCurveTo(cx+D_c_px/2-coilR*1.5, cy_coil+pitch*0.15, cx-D_c_px/2+coilR*1.5, cy_mid-pitch*0.15, cx-D_c_px/2, cy_mid);
            ctx.stroke();

            ctx.beginPath(); ctx.strokeStyle = coilStroke; ctx.lineWidth = 1; ctx.lineCap = 'butt';
            ctx.moveTo(cx + D_c_px/2, cy_coil);
            ctx.bezierCurveTo(cx+D_c_px/2-coilR*1.5, cy_coil+pitch*0.15, cx-D_c_px/2+coilR*1.5, cy_mid-pitch*0.15, cx-D_c_px/2, cy_mid);
            ctx.stroke();

            ctx.beginPath(); ctx.ellipse(cx - D_c_px/2, cy_mid,  coilR*0.55, coilR, 0, 0, Math.PI*2);
            ctx.fillStyle = coilFill; ctx.fill();
            ctx.strokeStyle = coilStroke; ctx.lineWidth = 1.5; ctx.stroke();

            ctx.beginPath(); ctx.ellipse(cx + D_c_px/2, cy_coil, coilR*0.55, coilR, 0, 0, Math.PI*2);
            ctx.fillStyle = coilFill; ctx.fill(); ctx.stroke();

            ctx.beginPath(); ctx.ellipse(cx-D_c_px/2-coilR*0.15, cy_mid-coilR*0.28,  coilR*0.18, coilR*0.3, -0.3, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill();
            ctx.beginPath(); ctx.ellipse(cx+D_c_px/2-coilR*0.15, cy_coil-coilR*0.28, coilR*0.18, coilR*0.3, -0.3, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ── インペラ＋シャフト ────────────────────────────────────
    const nowPerf     = performance.now();
    let   angle       = 0;
    if (heatSimActive) {
        const dtSec = Math.min((nowPerf - (simLastFrameTime || nowPerf)) / 1000, 0.05);
        const omega = (N_rpm > 5) ? (N_rpm * Math.PI / 30) : 0;
        simImpellerAngle += omega * dtSec;
        simImpellerAngle  = simImpellerAngle % (2 * Math.PI);
    }
    simLastFrameTime = nowPerf;
    angle = simImpellerAngle;

    const clearance_px    = config.clearance * scale;
    const b_px            = config.b * scale;
    const y_bottom_imp    = y_deepest - clearance_px - b_px / 2;
    const d_px            = config.d * scale;
    const r_hub           = 5;
    const r_out           = d_px / 2;

    const bladeCountMap = { 'flat-turbine':6, 'pitched-paddle':4, 'flat-paddle':2, 'propeller':3, 'faudler':3 };
    const defaultBlades = bladeCountMap[config.impellerType] || 2;
    const nBlades       = Math.max(1, Number.isFinite(config.np) ? config.np : defaultBlades);

    const n_stages = getActiveStages();
    let stages_y   = [];
    if (n_stages === 1) {
        stages_y.push(y_bottom_imp);
    } else {
        const y_top_limit    = y_liquid + b_px / 2;
        const available_span = y_bottom_imp - y_top_limit;
        const ideal_gap      = available_span / (n_stages - 1);
        const stage_gap      = Math.max(b_px * 1.3, ideal_gap);
        for (let i = 0; i < n_stages; i++) stages_y.push(y_bottom_imp - (i * stage_gap));
    }

    const drawElements = [];

    drawElements.push({ avgZ: -0.1, draw: () => {
        ctx.save(); ctx.strokeStyle = '#52525b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, y_liquid - 15); ctx.lineTo(cx, y_bottom_imp + b_px/2); ctx.stroke();
        ctx.restore();
    }});

    stages_y.forEach(y_imp => {
        if (config.impellerType === 'flat-turbine') {
            drawElements.push({ avgZ: 0.01, draw: () => {
                ctx.save(); ctx.fillStyle = '#a1a1aa'; ctx.strokeStyle = '#52525b'; ctx.lineWidth = 0.8;
                ctx.fillRect(cx - r_out*0.7, y_imp-1.5, r_out*1.4, 3);
                ctx.strokeRect(cx - r_out*0.7, y_imp-1.5, r_out*1.4, 3); ctx.restore();
            }});
        }
        drawElements.push({ avgZ: 0.02, draw: () => {
            ctx.save(); ctx.fillStyle = '#3f3f46'; ctx.strokeStyle = '#27272a'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, y_imp, r_hub, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            const markerAngle = angle;
            const mx = cx + Math.cos(markerAngle) * (r_hub-3);
            const my = y_imp + Math.sin(markerAngle) * (r_hub-3);
            ctx.fillStyle = '#fde047';
            ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, y_imp); ctx.lineTo(mx, my); ctx.stroke();
            ctx.restore();
        }});

        for (let k = 0; k < nBlades; k++) {
            const phi = angle + (k * 2 * Math.PI / nBlades);
            const { points, avgZ } = getBladePointsAndDepth(phi, r_hub, r_out, b_px, config.impellerType, cx, y_imp);
            const brightness  = 0.65 + 0.35 * ((avgZ / r_out) * 0.5 + 0.5);
            const baseH       = 330;
            const fillColor   = `hsl(${baseH},75%,${Math.round(50*brightness)}%)`;
            const strokeColor = `hsl(${baseH},80%,${Math.round(38*brightness)}%)`;
            drawElements.push({ avgZ, draw: () => {
                ctx.save(); ctx.fillStyle = fillColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
            }});
        }
    });

    drawElements.sort((a, b) => a.avgZ - b.avgZ);
    drawElements.forEach(el => el.draw());

    // ── 容器アウトライン ──────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lx, y_liquid - 10); ctx.lineTo(lx, y_cyl);
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        ctx.ellipse(cx, y_cyl, D_px/2, hb, 0, Math.PI, 0, true);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl, D_px/2, Math.PI, 0, true);
    } else {
        ctx.lineTo(rx, y_cyl);
    }
    ctx.lineTo(rx, y_liquid - 10);
    ctx.stroke();
    ctx.restore();

    // ── [変更4] カラーバーを描画（温度コンター表示時のみ） ────
    if (heatShowThermalMap) {
        _drawColorBar(ctx, canvas, tMin, tMax);
    }

    // ── シミュレーションパラメータバッジ ────────────────────
    ctx.save();
    const n_sim  = N_rpm / 60;
    const Re_sim = calculateReVal(n_sim);
    const { Np } = calculateNpCurve(Re_sim);
    const effRho = getEffectiveDensity();
    const d_val  = config.d || 0.060;
    const V_liq  = calcLiquidVolumeForPv() || 0.001;
    const P_sim  = Np * effRho * Math.pow(n_sim, 3) * Math.pow(d_val, 5);
    const Pv_sim = P_sim / V_liq;

    const badgeTitle = 'シミュレーション値';
    const txtRe = `Re: ${Math.round(Re_sim).toLocaleString()}`;
    const txtNp = `Np: ${Np.toFixed(3)}`;
    const txtPv = `Pv: ${Pv_sim.toFixed(1)} W/m³`;

    ctx.font = 'bold 9px Inter, Outfit, Noto Sans JP, sans-serif';
    const maxTextWidth = Math.max(
        ctx.measureText(badgeTitle).width, ctx.measureText(txtRe).width,
        ctx.measureText(txtNp).width,      ctx.measureText(txtPv).width
    );
    const badgeW = maxTextWidth + 16;
    const badgeH = 50;
    const badgeX = canvas.width - badgeW - 10;
    const badgeY = 15;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    else ctx.rect(badgeX, badgeY, badgeW, badgeH);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillText(badgeTitle, badgeX + 8, badgeY + 6);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText(txtRe, badgeX + 8, badgeY + 18);
    ctx.fillText(txtNp, badgeX + 8, badgeY + 28);
    ctx.fillText(txtPv, badgeX + 8, badgeY + 38);
    ctx.restore();
}
