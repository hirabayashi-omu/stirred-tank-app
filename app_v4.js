// Core Agitator Simulation and Data Plotting script

// State Management
let config = {
    expNumber: 'EXP-001',
    expDate: '',
    expAuthor: '攪拌 太郎',
    ambientTemp: 25,
    g: 9.806,
    liquidTemp: 25,
    rho: 998,
    mu: 0.417,
    V_act: 0.7295,
    DT: 0.105,
    H: 0.093,
    headType: 'semi-elliptical',
    impellerType: 'pitched-paddle',
    np: 4,
    theta: 45,
    d: 0.060,
    b: 0.020,
    clearance: 0.020,
    n_stage: 1,
    baffleActive: true,
    nB: 1,
    Bw: 0.014,
    dp_um: 150,
    rho_S: 2500,
    solidCp: 800,
    solidK: 1.0,
    solidConcMode: 'wt-ratio',
    solidConcVal: 1.0,
    sFactorMode: 'auto',
    sFactorCustom: 5.0,
    simSpeed: 300,
    simSpeedSync: true,
    activeTab: 'rushton',
    solidLiquidActive: true,
    // Particle simulation start mode: 'near-impeller' | 'suspended' | 'settled' | 'uniform'
    particleStartMode: 'near-impeller',
    // Heat transfer parameters
    liquidTempInit: 20,
    liquidCp: 4184,
    liquidK: 0.60,
    wallThickness: 0.003,
    wallK: 16.3,
    jacketType: 'flat',
    jacketGap: 0.010,
    coilActive: false,
    coilOuterDia: 0.010,
    coilInnerDia: 0.008,
    coilPitch: 0.025,
    coilCenterDia: null,
    coilK: 16.3,
    mediaType: 'water',
    mediaTempIn: 80,
    mediaFlow: 0.05,
    mediaRho: 1000,
    mediaMu: 0.001,
    mediaCp: 4184,
    mediaK: 0.60,
    mediaViscCorr: 1.0,
    foulingFactor: 0.0001
};

// Heat Simulation State variables
let heatSimActive = false;
let heatSimTime = 0.0;
let heatSimTemp = 20.0;
let heatParticles = [];
let heatSimAnimId = null;
let heatSimLastTime = null;
let heatChart = null;
let heatResistChart = null;
let heatShowThermalMap = false;
let heatColorScaleMode = 'relative';
let thermalGridData = null;
let thermalOffscreenCanvas = null;
let heatChartData = {
    times: [],
    liquidTemp: [],
    mediaTempOut: []
};

// Rheology model state (loaded from viscometer CSV)
let rheologyData = {
    samples: {},         // { sampleName: [ { modelId, name, rating, r2, rmse, mae, params:{} } ] }
    activeSample: null,
    activeModel: 'newtonian',
    ks: 11.5
};

let expBlocks = [];
let chart = null;

// -------------------------------------------------------
// Default scale presets (seeded once into localStorage)
// -------------------------------------------------------
// Geometric similarity: D_T : H : d : b : C ≈ 1 : 1.1 : 0.6 : 0.2 : 0.2
// Wall thickness and jacket gap scale with D_T.
// Solid particles, baffle settings, and heat-transfer media
// are kept at typical laboratory values across all scales.

const DEFAULT_SCALE_PRESETS = [
    {
        name: "【極小】Lab Scale – 0.1 L (DT=60 mm)",
        config: {
            g: 9.806,
            rho: 998, mu: 0.001,
            V_act: 0.17,
            liquidTempInit: 20, liquidCp: 4184, liquidK: 0.60,
            DT: 0.060, H: 0.065, headType: 'semi-elliptical',
            wallThickness: 0.002, wallK: 16.3,
            impellerType: 'pitched-paddle', np: 4, theta: 45,
            d: 0.036, b: 0.012, clearance: 0.012, n_stage: 1,
            baffleActive: true, nB: 1, Bw: 0.008,
            jacketType: 'flat', jacketGap: 0.006,
            coilActive: false, coilOuterDia: 0.006, coilInnerDia: 0.004,
            coilPitch: 0.015, coilCenterDia: null, coilK: 16.3,
            mediaType: 'water', mediaTempIn: 80, mediaFlow: 0.01,
            mediaRho: 1000, mediaMu: 0.001, mediaCp: 4184, mediaK: 0.60,
            mediaViscCorr: 1.0, foulingFactor: 0.0001,
            dp_um: 100, rho_S: 2500, solidCp: 800, solidK: 1.0, solidLiquidActive: true,
            solidConcMode: 'wt-ratio', solidConcVal: 1.0,
            sFactorMode: 'auto', sFactorCustom: 5.0,
            simSpeed: 600, simSpeedSync: false, activeTab: 'rushton'
        }
    },
    {
        name: "【小】Lab Scale – 1 L (DT=105 mm)",
        config: {
            g: 9.806,
            rho: 998, mu: 0.417,
            V_act: 0.7295,
            liquidTempInit: 20, liquidCp: 4184, liquidK: 0.60,
            DT: 0.105, H: 0.093, headType: 'semi-elliptical',
            wallThickness: 0.003, wallK: 16.3,
            impellerType: 'pitched-paddle', np: 4, theta: 45,
            d: 0.060, b: 0.020, clearance: 0.020, n_stage: 1,
            baffleActive: true, nB: 1, Bw: 0.014,
            jacketType: 'flat', jacketGap: 0.010,
            coilActive: false, coilOuterDia: 0.010, coilInnerDia: 0.008,
            coilPitch: 0.025, coilCenterDia: null, coilK: 16.3,
            mediaType: 'water', mediaTempIn: 80, mediaFlow: 0.05,
            mediaRho: 1000, mediaMu: 0.001, mediaCp: 4184, mediaK: 0.60,
            mediaViscCorr: 1.0, foulingFactor: 0.0001,
            dp_um: 150, rho_S: 2500, solidCp: 800, solidK: 1.0, solidLiquidActive: true,
            solidConcMode: 'wt-ratio', solidConcVal: 1.0,
            sFactorMode: 'auto', sFactorCustom: 5.0,
            simSpeed: 300, simSpeedSync: false, activeTab: 'rushton'
        }
    },
    {
        name: "【中】Bench Scale – 10 L (DT=240 mm)",
        config: {
            g: 9.806,
            rho: 998, mu: 0.001,
            V_act: 9.0,
            liquidTempInit: 20, liquidCp: 4184, liquidK: 0.60,
            DT: 0.240, H: 0.260, headType: 'semi-elliptical',
            wallThickness: 0.004, wallK: 16.3,
            impellerType: 'pitched-paddle', np: 4, theta: 45,
            d: 0.144, b: 0.048, clearance: 0.048, n_stage: 1,
            baffleActive: true, nB: 4, Bw: 0.024,
            jacketType: 'flat', jacketGap: 0.012,
            coilActive: false, coilOuterDia: 0.019, coilInnerDia: 0.015,
            coilPitch: 0.048, coilCenterDia: null, coilK: 16.3,
            mediaType: 'water', mediaTempIn: 80, mediaFlow: 0.20,
            mediaRho: 1000, mediaMu: 0.001, mediaCp: 4184, mediaK: 0.60,
            mediaViscCorr: 1.0, foulingFactor: 0.0001,
            dp_um: 150, rho_S: 2500, solidCp: 800, solidK: 1.0, solidLiquidActive: true,
            solidConcMode: 'wt-ratio', solidConcVal: 1.0,
            sFactorMode: 'auto', sFactorCustom: 5.0,
            simSpeed: 150, simSpeedSync: false, activeTab: 'rushton'
        }
    },
    {
        name: "【大】Pilot Scale – 100 L (DT=500 mm)",
        config: {
            g: 9.806,
            rho: 998, mu: 0.001,
            V_act: 102.0,
            liquidTempInit: 20, liquidCp: 4184, liquidK: 0.60,
            DT: 0.500, H: 0.520, headType: 'semi-elliptical',
            wallThickness: 0.006, wallK: 16.3,
            impellerType: 'pitched-paddle', np: 4, theta: 45,
            d: 0.300, b: 0.100, clearance: 0.100, n_stage: 1,
            baffleActive: true, nB: 4, Bw: 0.050,
            jacketType: 'flat', jacketGap: 0.015,
            coilActive: false, coilOuterDia: 0.038, coilInnerDia: 0.030,
            coilPitch: 0.095, coilCenterDia: null, coilK: 16.3,
            mediaType: 'water', mediaTempIn: 80, mediaFlow: 0.80,
            mediaRho: 1000, mediaMu: 0.001, mediaCp: 4184, mediaK: 0.60,
            mediaViscCorr: 1.0, foulingFactor: 0.0001,
            dp_um: 200, rho_S: 2500, solidCp: 800, solidK: 1.0, solidLiquidActive: true,
            solidConcMode: 'wt-ratio', solidConcVal: 1.0,
            sFactorMode: 'auto', sFactorCustom: 5.0,
            simSpeed: 80, simSpeedSync: false, activeTab: 'rushton'
        }
    },
    {
        name: "【極大】Plant Scale – 1000 L (DT=1100 mm)",
        config: {
            g: 9.806,
            rho: 998, mu: 0.001,
            V_act: 1045.0,
            liquidTempInit: 20, liquidCp: 4184, liquidK: 0.60,
            DT: 1.100, H: 1.150, headType: 'semi-elliptical',
            wallThickness: 0.010, wallK: 16.3,
            impellerType: 'pitched-paddle', np: 4, theta: 45,
            d: 0.660, b: 0.220, clearance: 0.220, n_stage: 2,
            baffleActive: true, nB: 4, Bw: 0.110,
            jacketType: 'flat', jacketGap: 0.020,
            coilActive: false, coilOuterDia: 0.076, coilInnerDia: 0.062,
            coilPitch: 0.200, coilCenterDia: null, coilK: 16.3,
            mediaType: 'water', mediaTempIn: 80, mediaFlow: 3.0,
            mediaRho: 1000, mediaMu: 0.001, mediaCp: 4184, mediaK: 0.60,
            mediaViscCorr: 1.0, foulingFactor: 0.0001,
            dp_um: 250, rho_S: 2500, solidCp: 800, solidK: 1.0, solidLiquidActive: true,
            solidConcMode: 'wt-ratio', solidConcVal: 1.0,
            sFactorMode: 'auto', sFactorCustom: 5.0,
            simSpeed: 40, simSpeedSync: false, activeTab: 'rushton'
        }
    }
];

/**
 * Seeds DEFAULT_SCALE_PRESETS into localStorage.
 * Entries whose name already exists in localStorage are skipped
 * so that any user customisation is preserved.
 */
function seedDefaultPresets() {
    let presets = [];
    try {
        presets = JSON.parse(localStorage.getItem('agitator_presets')) || [];
    } catch (e) {
        presets = [];
    }

    const existingNames = new Set(presets.map(p => p.name));
    // Collect only new entries (preserving definition order)
    const toAdd = DEFAULT_SCALE_PRESETS.filter(dp => !existingNames.has(dp.name));

    if (toAdd.length > 0) {
        // Prepend in reverse so the first entry ends up at index 0
        toAdd.slice().reverse().forEach(dp => presets.unshift(dp));
        try {
            localStorage.setItem('agitator_presets', JSON.stringify(presets));
        } catch (e) {
            console.warn('Could not seed default presets:', e);
        }
    }
}

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    seedDefaultPresets();
    loadPresetList();

    // Attempt to load saved state from localStorage
    const savedState = localStorage.getItem('agitator_current_state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            if (parsed.config) {
                config = { ...config, ...parsed.config };
            }

            if (parsed.rheologyData) {
                rheologyData = parsed.rheologyData;
            }

            initInputs();
            updateRheologyUI();

            if (parsed.expBlocks && parsed.expBlocks.length > 0) {
                expBlocks = [];
                document.getElementById('blocks-container').innerHTML = '';
                parsed.expBlocks.forEach(block => {
                    expBlocks.push(block);
                    renderBlockHTML(block);
                    recalculateBlock(block.id);
                });
            } else {
                addBlock({ name: '300 rpm 条件', N_default: 300 });
            }
        } catch (e) {
            console.error("Failed to load saved state", e);
            initInputs();
            addBlock({ name: '300 rpm 条件', N_default: 300 });
        }
    } else {
        initInputs();
        addBlock({ name: '300 rpm 条件', N_default: 300 });
    }

    recalculateAll();
    switchMainTab(config.activeTab || 'rushton');
    feather.replace();
});

function syncSpeedUIElements() {
    const speed = config.simSpeed ?? 300;
    const sync = config.simSpeedSync ?? true;

    const slider1 = document.getElementById('sim-speed-slider');
    const val1 = document.getElementById('sim-speed-val');
    const sync1 = document.getElementById('sim-speed-sync');

    const slider2 = document.getElementById('heat-sim-speed-slider');
    const val2 = document.getElementById('heat-sim-speed-val');
    const sync2 = document.getElementById('heat-sim-speed-sync');

    if (slider1) slider1.value = speed;
    if (val1) val1.textContent = speed;
    if (sync1) sync1.checked = sync;

    if (slider2) slider2.value = speed;
    if (val2) val2.textContent = speed;
    if (sync2) sync2.checked = sync;
}

// Bind UI inputs to State
function initInputs() {
    // もし localStorage から古い "攻拈 太郎" が読み込まれた場合は "攪拌 太郎" に置換
    if (config.expAuthor === '攻拈 太郎') {
        config.expAuthor = '攪拌 太郎';
    }

    // Set default date to today if empty
    if (!config.expDate) {
        const today = new Date().toISOString().split('T')[0];
        config.expDate = today;
    }

    // Load config state to inputs
    document.getElementById('exp-number').value = config.expNumber;
    document.getElementById('exp-date').value = config.expDate;
    document.getElementById('exp-author').value = config.expAuthor;
    document.getElementById('ambient-temp').value = config.ambientTemp ?? 25;
    document.getElementById('g').value = config.g;
    document.getElementById('rho').value = config.rho;
    document.getElementById('mu').value = config.mu;
    document.getElementById('V-act').value = config.V_act ?? 0;
    document.getElementById('DT').value = config.DT;
    document.getElementById('H').value = config.H;
    document.getElementById('head-type').value = config.headType;
    document.getElementById('impeller-type').value = config.impellerType;
    document.getElementById('np').value = config.np;
    document.getElementById('theta').value = config.theta;
    document.getElementById('d').value = config.d;
    document.getElementById('b').value = config.b;
    document.getElementById('clearance').value = config.clearance;
    document.getElementById('n_stage').value = config.n_stage;
    document.getElementById('baffle-active').checked = config.baffleActive;
    document.getElementById('nB').value = config.nB;
    document.getElementById('Bw').value = config.Bw;

    toggleBaffleInputs();

    // 羽根角度 θ の初期ロック状態反映
    const isFlat = config.impellerType === 'flat-paddle' || config.impellerType === 'flat-turbine';
    const thetaInput = document.getElementById('theta');
    if (thetaInput) {
        thetaInput.disabled = isFlat;
        if (isFlat) {
            thetaInput.value = 90;
            config.theta = 90;
        }
    }

    // 粒子・固液撹拌データのロード
    document.getElementById('solid-liquid-active').checked = config.solidLiquidActive ?? true;
    document.getElementById('dp-um').value = config.dp_um ?? 150;
    document.getElementById('rho-S').value = config.rho_S ?? 2500;
    document.getElementById('solid-cp').value = config.solidCp ?? 800;
    document.getElementById('solid-k').value = config.solidK ?? 1.0;
    document.getElementById('solid-conc-mode').value = config.solidConcMode ?? 'wt-ratio';
    document.getElementById('solid-conc-val').value = config.solidConcVal ?? 1.0;
    document.getElementById('s-factor-mode').value = config.sFactorMode ?? 'auto';
    document.getElementById('s-factor-custom').value = config.sFactorCustom ?? 5.0;

    const cModel = document.getElementById('cavern-model');
    if (cModel) cModel.value = config.cavernModel ?? 'spherical';

    // キャバーン α の初期ロード
    const cavernAlphaInput = document.getElementById('cavern-alpha');
    if (cavernAlphaInput) {
        cavernAlphaInput.value = config.cavernAlpha ?? 0.7;
        const alphaGroup = document.getElementById('cavern-alpha-group');
        if (alphaGroup) {
            alphaGroup.style.display = config.cavernModel === 'cylindrical' ? 'block' : 'none';
        }
    }

    syncSpeedUIElements();

    // 伝熱データのロード
    document.getElementById('liquid-temp-init').value = config.liquidTempInit ?? 20;
    document.getElementById('liquid-cp').value = config.liquidCp ?? 4184;
    document.getElementById('liquid-k').value = config.liquidK ?? 0.60;
    document.getElementById('wall-thickness').value = config.wallThickness ?? 0.003;
    document.getElementById('wall-k').value = config.wallK ?? 16.3;
    document.getElementById('jacket-type').value = config.jacketType ?? 'flat';
    document.getElementById('jacket-gap').value = config.jacketGap ?? 0.010;
    document.getElementById('coil-active').checked = config.coilActive ?? false;
    // コイル寸法入力の初期値セット
    document.getElementById('coil-outer-dia').value = config.coilOuterDia ?? 0.010;
    document.getElementById('coil-inner-dia').value = config.coilInnerDia ?? 0.008;
    document.getElementById('coil-pitch').value = config.coilPitch ?? 0.025;
    document.getElementById('coil-center-dia').value = config.coilCenterDia ?? '';
    document.getElementById('coil-k').value = config.coilK ?? 16.3;
    // パネル表示切替
    const coilPanel = document.getElementById('coil-params');
    if (coilPanel) coilPanel.style.display = config.coilActive ? 'flex' : 'none';
    document.getElementById('media-type').value = config.mediaType ?? 'water';
    document.getElementById('media-temp-in').value = config.mediaTempIn ?? 80;
    document.getElementById('media-flow').value = config.mediaFlow ?? 0.05;
    document.getElementById('media-rho').value = config.mediaRho ?? 1000;
    document.getElementById('media-mu').value = config.mediaMu ?? 0.001;
    document.getElementById('media-cp').value = config.mediaCp ?? 4184;
    document.getElementById('media-k').value = config.mediaK ?? 0.60;
    document.getElementById('media-visc-corr').value = config.mediaViscCorr ?? 1.0;
    document.getElementById('fouling-factor').value = config.foulingFactor ?? 0.0001;

    updateSolidConcLabel();
    toggleSFactorCustom();
    toggleSolidLiquidInputs();
    toggleJacketGapInput();
    toggleMediaTypeInputs();
}

function initEventListeners() {
    initRheologyListeners();
    // Watch sidebar input changes
    const metaInputs = ['exp-number', 'exp-date', 'exp-author', 'ambient-temp'];
    metaInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            const key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            config[key] = e.target.value;
            saveCurrentState();
        });
    });

    const inputs = [
        'g', 'rho', 'mu', 'V-act', 'DT', 'H', 'head-type',
        'impeller-type', 'np', 'theta', 'd', 'b', 'clearance',
        'n_stage', 'nB', 'Bw'
    ];

    const getPropName = (id) => {
        if (id === 'head-type') return 'headType';
        if (id === 'impeller-type') return 'impellerType';
        if (id === 'V-act') return 'V_act';
        return id;
    };

    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            let val = e.target.value;
            if (e.target.type === 'number') {
                val = parseFloat(val) || 0;
            }
            if (id === 'np') {
                let parsed = parseInt(val) || 2;
                if (parsed < 2) {
                    parsed = 2;
                    e.target.value = 2;
                }
                val = parsed;
            }
            config[getPropName(id)] = val;

            // インペラ種類変更時にks値を自動セット
            if (id === 'impeller-type') {
                const presetMap = {
                    'pitched-paddle': 8.5,
                    'flat-paddle': 11.0,
                    'flat-turbine': 11.5,
                    'propeller': 10.0,
                    'faudler': 11.5
                };
                if (presetMap[val]) {
                    rheologyData.ks = presetMap[val];
                    const ksInput = document.getElementById('ks-input');
                    if (ksInput) ksInput.value = presetMap[val].toFixed(1);
                    if (typeof updateRheologyUI === 'function') updateRheologyUI();
                    showToast(`インペラ種類に合わせて kₛ を ${presetMap[val].toFixed(1)} に設定しました`, 'info');
                }

                // 羽根角度 θ の自動ロック（フラット翼の場合は90度に固定して無効化）
                const thetaInput = document.getElementById('theta');
                if (thetaInput) {
                    if (val === 'flat-paddle' || val === 'flat-turbine') {
                        thetaInput.value = 90;
                        thetaInput.disabled = true;
                        config.theta = 90;
                    } else {
                        thetaInput.disabled = false;
                        if (parseFloat(thetaInput.value) === 90) {
                            thetaInput.value = 45;
                            config.theta = 45;
                        }
                    }
                }
            }

            recalculateAll();
        });
    });

    // Particle simulation start mode selector
    const pStartEl = document.getElementById('particle-start-mode');
    if (pStartEl) {
        pStartEl.value = config.particleStartMode || 'near-impeller';
        pStartEl.addEventListener('change', (e) => {
            config.particleStartMode = e.target.value;
            // Reinitialize particle simulation to reflect new start distribution
            initParticleSimulation();
        });
    }

    document.getElementById('baffle-active').addEventListener('change', (e) => {
        config.baffleActive = e.target.checked;
        toggleBaffleInputs();
        recalculateAll();
    });

    // Control buttons
    document.getElementById('add-block-btn').addEventListener('click', () => {
        const userInput = prompt("追加する測定ブロックの初期回転数 N (rpm) を入力してください:", "300");
        if (userInput === null) return; // Cancelled

        const rpmVal = parseInt(userInput);
        if (isNaN(rpmVal) || rpmVal <= 0) {
            showToast('無効な回転数が入力されました。', 'error');
            return;
        }

        addBlock({ name: `測定ブロック (N = ${rpmVal} rpm)`, N_default: rpmVal });
        showToast(`N = ${rpmVal} rpm の測定ブロックを追加しました。`, 'success');
    });

    document.getElementById('clear-all-blocks-btn').addEventListener('click', () => {
        if (expBlocks.length === 0) {
            showToast('削除するブロックがありません。', 'info');
            return;
        }
        const confirmed = confirm(`全 ${expBlocks.length} ブロックを削除します。この操作は元に戻せません。よろしいですか？`);
        if (!confirmed) return;

        // 全ブロックを一括クリア
        expBlocks = [];
        const container = document.getElementById('blocks-container');
        if (container) {
            container.innerHTML = '';
        }
        recalculateAll();
        showToast('全ブロックを削除しました。', 'success');
    });

    document.getElementById('load-sample-btn').addEventListener('click', loadSampleData);
    document.getElementById('export-pdf-btn').addEventListener('click', generatePDFReport);
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
    document.getElementById('csv-file-input').addEventListener('change', importCSV);

    // Chart Y limit adjusters
    document.getElementById('chart-ymin').addEventListener('change', (e) => {
        if (chart) {
            const val = e.target.value;
            chart.options.scales.y.min = val === 'auto' ? undefined : parseFloat(val);
            chart.update();
        }
    });

    document.getElementById('chart-ymax').addEventListener('change', (e) => {
        if (chart) {
            const val = e.target.value;
            chart.options.scales.y.max = val === 'auto' ? undefined : parseFloat(val);
            chart.update();
        }
    });

    // Preset management event listeners
    const presetSelect = document.getElementById('preset-select');
    const loadPresetBtn = document.getElementById('load-preset-btn');
    const deletePresetBtn = document.getElementById('delete-preset-btn');

    presetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        loadPresetBtn.disabled = !val;
        deletePresetBtn.disabled = !val;
    });

    document.getElementById('save-preset-btn').addEventListener('click', () => {
        const name = prompt("プリセット名を入力してください:");
        if (name === null) return;
        const trimmed = name.trim();
        if (!trimmed) {
            showToast('プリセット名を入力してください。', 'error');
            return;
        }
        savePreset(trimmed);
    });

    loadPresetBtn.addEventListener('click', () => {
        const val = presetSelect.value;
        if (val) {
            loadPreset(val);
        }
    });

    deletePresetBtn.addEventListener('click', () => {
        const val = presetSelect.value;
        if (val && confirm(`プリセット "${val}" を削除してもよろしいですか？`)) {
            deletePreset(val);
        }
    });

    // 粒子・固液撹拌シミュレータ関連のイベントリスナ追加
    document.getElementById('solid-liquid-active').addEventListener('change', (e) => {
        config.solidLiquidActive = e.target.checked;
        toggleSolidLiquidInputs();
        recalculateAll();
    });

    document.getElementById('dp-um').addEventListener('input', (e) => {
        config.dp_um = parseFloat(e.target.value) || 150;
        recalculateAll();
    });
    document.getElementById('rho-S').addEventListener('input', (e) => {
        config.rho_S = parseFloat(e.target.value) || 2500;
        recalculateAll();
    });
    document.getElementById('solid-cp').addEventListener('input', (e) => {
        config.solidCp = parseFloat(e.target.value) || 800;
        recalculateAll();
    });
    document.getElementById('solid-k').addEventListener('input', (e) => {
        config.solidK = parseFloat(e.target.value) || 1.0;
        recalculateAll();
    });
    document.getElementById('solid-conc-mode').addEventListener('change', (e) => {
        config.solidConcMode = e.target.value;
        updateSolidConcLabel();
        recalculateAll();
    });
    document.getElementById('solid-conc-val').addEventListener('input', (e) => {
        config.solidConcVal = parseFloat(e.target.value) || 1.0;
        recalculateAll();
    });
    document.getElementById('s-factor-mode').addEventListener('change', (e) => {
        config.sFactorMode = e.target.value;
        toggleSFactorCustom();
        recalculateAll();
    });
    document.getElementById('s-factor-custom').addEventListener('input', (e) => {
        config.sFactorCustom = parseFloat(e.target.value) || 5.0;
        recalculateAll();
    });
    // --- Particle Simulator Speed Controls ---
    document.getElementById('sim-speed-slider').addEventListener('input', (e) => {
        config.simSpeed = parseFloat(e.target.value) || 0;

        // スライダーを手動で動かしたら自動同期を解除
        if (config.simSpeedSync) {
            config.simSpeedSync = false;
        }
        syncSpeedUIElements();

        if (simAnimId) {
            simLastFrameTime = performance.now();
        }
    });
    document.getElementById('sim-speed-slider').addEventListener('change', () => {
        updateSimulatorResultsOnly();
        saveCurrentState();
    });
    document.getElementById('sim-speed-sync').addEventListener('change', (e) => {
        config.simSpeedSync = e.target.checked;
        if (config.simSpeedSync) {
            syncSimulatorSpeedWithBlock();
        }
        syncSpeedUIElements();
        recalculateAll();
    });
    document.getElementById('btn-set-njs').addEventListener('click', () => {
        const njs_rpm_str = document.getElementById('sim-res-Njs-rpm').textContent;
        const njs_rpm = parseFloat(njs_rpm_str);
        if (!isNaN(njs_rpm) && njs_rpm > 0) {
            config.simSpeed = Math.round(njs_rpm);
            config.simSpeedSync = false;
            syncSpeedUIElements();
            updateSimulatorResultsOnly();
            saveCurrentState();
            showToast(`シミュレーション回転数を Njs (${config.simSpeed} rpm) に設定しました`, 'success');
        }
    });

    // --- Heat Simulator Speed Controls (Linked) ---
    const heatSlider = document.getElementById('heat-sim-speed-slider');
    if (heatSlider) {
        heatSlider.addEventListener('input', (e) => {
            config.simSpeed = parseFloat(e.target.value) || 0;
            if (config.simSpeedSync) {
                config.simSpeedSync = false;
            }
            syncSpeedUIElements();
            if (heatSimAnimId) {
                heatSimLastTime = performance.now();
            }
        });
        heatSlider.addEventListener('change', () => {
            updateSimulatorResultsOnly();
            saveCurrentState();
        });
    }
    const heatSync = document.getElementById('heat-sim-speed-sync');
    if (heatSync) {
        heatSync.addEventListener('change', (e) => {
            config.simSpeedSync = e.target.checked;
            if (config.simSpeedSync) {
                syncSimulatorSpeedWithBlock();
            }
            syncSpeedUIElements();
            recalculateAll();
        });
    }
    const heatSetNjs = document.getElementById('btn-heat-set-njs');
    if (heatSetNjs) {
        heatSetNjs.addEventListener('click', () => {
            const njs_rpm_str = document.getElementById('sim-res-Njs-rpm').textContent;
            const njs_rpm = parseFloat(njs_rpm_str);
            if (!isNaN(njs_rpm) && njs_rpm > 0) {
                config.simSpeed = Math.round(njs_rpm);
                config.simSpeedSync = false;
                syncSpeedUIElements();
                updateSimulatorResultsOnly();
                saveCurrentState();
                showToast(`シミュレーション回転数を Njs (${config.simSpeed} rpm) に設定しました`, 'success');
            }
        });
    }

    // Tab switching event listeners
    const tabRushton = document.getElementById('tab-btn-rushton');
    const tabPartsim = document.getElementById('tab-btn-partsim');
    const tabHeatsim = document.getElementById('tab-btn-heatsim');
    if (tabRushton && tabPartsim) {
        tabRushton.addEventListener('click', () => switchMainTab('rushton'));
        tabPartsim.addEventListener('click', () => switchMainTab('partsim'));
    }
    if (tabHeatsim) {
        tabHeatsim.addEventListener('click', () => switchMainTab('heatsim'));
    }

    // Heat transfer / thermal properties input watchers
    const heatInputs = [
        'liquid-temp-init', 'liquid-cp', 'liquid-k',
        'wall-thickness', 'wall-k', 'jacket-type', 'jacket-gap',
        'media-type', 'media-temp-in', 'media-flow', 'media-rho',
        'media-mu', 'media-cp', 'media-k', 'media-visc-corr', 'fouling-factor'
    ];
    const getHeatPropName = (id) => {
        if (id === 'media-temp-in') return 'mediaTempIn';
        if (id === 'media-visc-corr') return 'mediaViscCorr';
        return id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    };
    heatInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                let val = e.target.value;
                if (e.target.type === 'number') {
                    val = parseFloat(val) || 0;
                }
                config[getHeatPropName(id)] = val;

                if (id === 'jacket-type') {
                    toggleJacketGapInput();
                }
                if (id === 'media-type') {
                    toggleMediaTypeInputs();
                }

                recalculateAll();
            });
        }
    });

    document.getElementById('coil-active').addEventListener('change', (e) => {
        config.coilActive = e.target.checked;
        const panel = document.getElementById('coil-params');
        if (panel) panel.style.display = config.coilActive ? 'flex' : 'none';
        recalculateAll();
    });

    // コイル寸法入力
    [
        ['coil-outer-dia', 'coilOuterDia', 0.010],
        ['coil-inner-dia', 'coilInnerDia', 0.008],
        ['coil-pitch', 'coilPitch', 0.025],
        ['coil-k', 'coilK', 16.3],
    ].forEach(([id, key, def]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', (e) => {
            config[key] = parseFloat(e.target.value) || def;
            recalculateAll();
        });
    });
    const coilCenterEl = document.getElementById('coil-center-dia');
    if (coilCenterEl) coilCenterEl.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        config.coilCenterDia = isNaN(v) || v <= 0 ? null : v;
        recalculateAll();
    });

    // Heat simulation controls
    document.getElementById('btn-heat-sim-start').addEventListener('click', startHeatSimulation);
    document.getElementById('btn-heat-sim-pause').addEventListener('click', pauseHeatSimulation);
    document.getElementById('btn-heat-sim-reset').addEventListener('click', resetHeatSimulation);

    // Heat simulation view mode toggles
    const btnViewPart = document.getElementById('btn-heat-view-particles');
    const btnViewTherm = document.getElementById('btn-heat-view-thermal');
    if (btnViewPart && btnViewTherm) {
        btnViewPart.addEventListener('click', () => {
            heatShowThermalMap = false;
            btnViewPart.style.background = 'var(--accent-color)';
            btnViewPart.style.color = 'var(--text-primary)';
            btnViewTherm.style.background = 'transparent';
            btnViewTherm.style.color = 'var(--text-muted)';
            drawHeatSimulation();
        });
        btnViewTherm.addEventListener('click', () => {
            heatShowThermalMap = true;
            btnViewTherm.style.background = 'var(--accent-color)';
            btnViewTherm.style.color = 'var(--text-primary)';
            btnViewPart.style.background = 'transparent';
            btnViewPart.style.color = 'var(--text-muted)';
            drawHeatSimulation();
        });
    }

    const btnColorRelative = document.getElementById('btn-heat-colorscale-relative');
    const btnColorAbsolute = document.getElementById('btn-heat-colorscale-absolute');
    if (btnColorRelative && btnColorAbsolute) {
        const updateColorScaleBtns = () => {
            if (heatColorScaleMode === 'relative') {
                btnColorRelative.style.background = 'var(--accent-color)';
                btnColorRelative.style.color = 'var(--text-primary)';
                btnColorAbsolute.style.background = 'transparent';
                btnColorAbsolute.style.color = 'var(--text-muted)';
            } else {
                btnColorAbsolute.style.background = 'var(--accent-color)';
                btnColorAbsolute.style.color = 'var(--text-primary)';
                btnColorRelative.style.background = 'transparent';
                btnColorRelative.style.color = 'var(--text-muted)';
            }
        };
        btnColorRelative.addEventListener('click', () => {
            heatColorScaleMode = 'relative';
            updateColorScaleBtns();
            drawHeatSimulation();
            updateHeatChart();
        });
        btnColorAbsolute.addEventListener('click', () => {
            heatColorScaleMode = 'absolute';
            updateColorScaleBtns();
            drawHeatSimulation();
            updateHeatChart();
        });
        updateColorScaleBtns();
    }

    // Inner Tab switching event listeners (Zwietering vs Flow/Circulation)
    const btnSusp = document.getElementById('inner-tab-btn-suspension');
    const btnFlow = document.getElementById('inner-tab-btn-flow');
    if (btnSusp && btnFlow) {
        btnSusp.addEventListener('click', () => switchInnerTab('suspension'));
        btnFlow.addEventListener('click', () => switchInnerTab('flow'));
    }
}

function toggleBaffleInputs() {
    const active = config.baffleActive;
    const nBContainer = document.getElementById('nB-container');
    const BwContainer = document.getElementById('Bw-container');
    if (nBContainer && BwContainer) {
        nBContainer.style.display = active ? 'flex' : 'none';
        BwContainer.style.display = active ? 'flex' : 'none';
    }
}

function toggleSolidLiquidInputs() {
    const active = config.solidLiquidActive;

    // Toggle container elements visibility via class
    const ids = [
        'dp-um-container',
        'rho-S-container',
        'solid-cp-container',
        'solid-k-container',
        'solid-conc-mode-container',
        'solid-conc-val-container',
        's-factor-mode-container'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('sl-hidden', !active);
    });

    // Toggle Effective Properties children based on solid-liquid active state
    const elWsCont = document.getElementById('sl-eff-ws-container');
    const elPhisCont = document.getElementById('sl-eff-phis-container');
    const elKDetailsCont = document.getElementById('sl-eff-k-details-container');
    const elKSingleCont = document.getElementById('sl-eff-k-single-container');

    if (elWsCont) elWsCont.style.display = active ? 'block' : 'none';
    if (elPhisCont) elPhisCont.style.display = active ? 'block' : 'none';
    if (elKDetailsCont) elKDetailsCont.style.display = active ? 'block' : 'none';
    if (elKSingleCont) elKSingleCont.style.display = active ? 'none' : 'block';

    // Section and divider are always displayed as general summary of physical properties
    const elDivider = document.getElementById('sl-eff-divider');
    const elSection = document.getElementById('sl-effective-properties-section');
    if (elDivider) elDivider.style.display = 'block';
    if (elSection) elSection.style.display = 'block';

    // Custom S factor container visibility
    toggleSFactorCustom();

    // Toggle Tab Button visibility
    const tabBtn = document.getElementById('tab-btn-partsim');
    if (tabBtn) {
        tabBtn.style.display = active ? 'flex' : 'none';
    }

    // If solid-liquid system is deactivated and active tab was 'partsim', switch to 'rushton'
    if (!active && config.activeTab === 'partsim') {
        switchMainTab('rushton');
    }

    // 有効物性値UIを更新
    updateEffectivePropertiesUI();
}

/**
 * スラリー密度 ρ_sl を計算して表示する。
 * 式(2.3.2): ρ_sl = ε·ρ_L + (1-ε)·ρ_s
 * 空隙率 ε（液が占める体積割合）は固体質量分率 c_s から
 *   c_s = (1-ε)·ρ_s / [ε·ρ_L + (1-ε)·ρ_s]
 * を逆算して求める。
 * 対液重量比 X [wt%] のとき c_s = X/(100+X)
 * 全体重量濃度 w [wt%] のとき c_s = w/100
 */
function updateSlurryDensityUI() {
    const el = document.getElementById('rho-sl-display');
    const container = document.getElementById('rho-sl-container');

    console.log("updateSlurryDensityUI", {
        elExist: !!el,
        containerExist: !!container,
        solidLiquidActive: config.solidLiquidActive,
        rhoL: config.rho,
        rhoS: config.rho_S,
        solidConcMode: config.solidConcMode,
        solidConcVal: config.solidConcVal
    });

    if (!el) return;

    if (!config.solidLiquidActive) {
        if (container) container.classList.add('sl-hidden');
        return;
    }
    if (container) container.classList.remove('sl-hidden');

    const rhoL = config.rho;          // 液密度 [kg/m³]
    const rhoS = config.rho_S ?? 2500; // 固体粒子密度 [kg/m³]

    // 固体質量分率 c_s（全体基準 0〜1）
    let c_s = 0;
    if (config.solidConcMode === 'wt-total') {
        const w = config.solidConcVal ?? 1.0;
        c_s = Math.max(0, Math.min(0.9999, w / 100));
    } else {
        // 対液重量比 X [wt%]: c_s = X/(100+X)
        const X = config.solidConcVal ?? 1.0;
        c_s = X / (100 + X);
    }

    if (rhoS <= 0 || rhoL <= 0) { el.textContent = '-- (無効な密度)'; return; }

    // 空隙率 ε（液の体積分率）
    // c_s = (1-ε)·ρ_s / [ε·ρ_L + (1-ε)·ρ_s]
    // 解: ε = ρ_s·(1-c_s) / [ρ_s·(1-c_s) + ρ_L·c_s]
    const eps = (rhoS * (1 - c_s)) / (rhoS * (1 - c_s) + rhoL * c_s);

    // ρ_sl = ε·ρ_L + (1-ε)·ρ_s
    const rhoSl = eps * rhoL + (1 - eps) * rhoS;

    el.innerHTML = `${rhoSl.toFixed(1)} <span style="font-size:0.75rem;opacity:0.75;">(ε = ${eps.toFixed(4)})</span>`;
}

function getSolidVolumeFraction() {
    const rhoS = config.rho_S ?? 2500;
    const rhoL = config.rho;
    if (rhoS <= 0 || rhoL <= 0) return 0;

    let c_s = 0;
    if (config.solidConcMode === 'wt-total') {
        const w = config.solidConcVal ?? 1.0;
        c_s = Math.max(0, Math.min(0.9999, w / 100));
    } else {
        const X = config.solidConcVal ?? 1.0;
        c_s = X / (100 + X);
    }

    return (c_s / rhoS) / (c_s / rhoS + (1 - c_s) / rhoL);
}

function getParticleTargetCount(coords) {
    const phi_s = getSolidVolumeFraction();
    const tankArea = Math.PI * Math.pow(coords.D_px / 2, 2);
    const meanParticleRadiusPx = 2.4;
    const particleArea = Math.PI * meanParticleRadiusPx * meanParticleRadiusPx;
    const rawCount = phi_s * tankArea / particleArea * 9.0;
    return Math.min(3000, Math.max(200, Math.round(rawCount)));
}

/**
 * 液量の概算値を計算してUIに表示する。
 */
function updateVEstDisplay() {
    const el = document.getElementById('v-est-display');
    const hEl = document.getElementById('h-est-display');
    if (!el && !hEl) return;
    try {
        const vEstM3 = calcLiquidVolume();
        const vEstL = vEstM3 * 1000;
        const V_act_m3 = (config.V_act && config.V_act > 0) ? config.V_act * 1e-3 : null;
        const hCyl = calcLiquidHeightFromVolume(V_act_m3 || vEstM3); // 円筒部高さ

        // 鏡板高さを加算して全高を計算
        let hb_m = 0;
        if (config.headType === 'semi-elliptical') hb_m = config.DT / 4;
        else if (config.headType === 'dish') hb_m = config.DT * 0.1935;
        else if (config.headType === 'hemispherical') hb_m = config.DT / 2;
        const hTotal = hCyl + hb_m; // 鏡板最深部からの全高

        if (el) {
            if (config.V_act && config.V_act > 0) {
                el.textContent = `実測値: ${config.V_act.toFixed(4)} L、概算値: ${vEstL.toFixed(4)} L`;
            } else {
                el.textContent = `概算値: ${vEstL.toFixed(4)} L`;
            }
        }
        if (hEl) {
            // 全高（鏡板含む）を表示 ← ここを修正
            hEl.textContent = `液高(鏡板含む全高): ${hTotal.toFixed(4)} m`;
        }
    } catch (e) {
        console.error("Failed to update V_est display", e);
    }
}

function toggleJacketGapInput() {
    const container = document.getElementById('jacket-gap-container');
    if (container) {
        container.style.display = 'flex';
    }
}

function toggleMediaTypeInputs() {
    const type = config.mediaType || 'water';
    const isWater = type === 'water';
    const fields = [
        'media-flow', 'media-rho', 'media-mu', 'media-cp', 'media-k', 'media-visc-corr'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = !isWater;
            el.style.opacity = isWater ? '1.0' : '0.4';
        }
    });
}

// Show feedback message
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.className = `toast show ${type}`;
    toast.textContent = message;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ----------------------------------------------------
// Mathematical Core: Kamei-Hiraoka-Kato Correlations
// ----------------------------------------------------

function getKameiHiraokaIntermediateVars() {
    const { DT, d, np, b, H, theta, impellerType } = config;
    const D_d = DT / d;
    const d_D = d / DT;
    const thetaRad = (theta * Math.PI) / 180;

    const beta = (2 * Math.log(D_d)) / (D_d - d_D);

    // np in log term instead of eta (Self-consistent bug correction)
    const etaNumerator = 0.711 * (0.157 + Math.pow(np * Math.log(D_d), 0.611));
    const etaDenominator = Math.pow(np, 0.52) * (1 - Math.pow(d_D, 2));
    const eta = etaNumerator / etaDenominator;

    const gamma = Math.pow((eta * Math.log(D_d)) / Math.pow(beta * D_d, 5), 1 / 3);
    const X = (gamma * Math.pow(np, 0.7) * b * Math.pow(Math.sin(thetaRad), 1.6)) / H;

    // 加藤らの修正式（プロペラ・ファウドラー用）とパドル用の条件切り替え
    let Ct_coef = 1.96;
    let Ct_exp = 1.19;
    let m_coef = 0.71;

    if (impellerType === 'propeller' || impellerType === 'faudler') {
        Ct_coef = 3.0;
        Ct_exp = 1.5;
        m_coef = 0.8;
    }

    const Ct = Math.pow(Math.pow(Ct_coef * Math.pow(X, Ct_exp), -7.8) + Math.pow(0.25, -7.8), -1 / 7.8);
    const m = Math.pow(Math.pow(m_coef * Math.pow(X, 0.373), -7.8) + Math.pow(0.333, -7.8), -1 / 7.8);
    const Cu = 23.8 * Math.pow(d_D, -3.24) * Math.pow((b * Math.sin(thetaRad)) / DT, -1.18) * Math.pow(X, -0.74);
    const f_infty = 0.0151 * d_D * Math.pow(Ct, 0.308);

    const term1_CL = 0.215 * eta * np * (d / H) * (1 - Math.pow(d_D, 2));
    const term2_CL = 1.83 * ((b * Math.sin(thetaRad)) / H) * Math.pow(np / (2 * Math.sin(thetaRad)), 1 / 3);
    const CL = term1_CL + term2_CL;

    const ReG_ratio = (Math.PI * eta * Math.log(D_d)) / (4 * d / (beta * DT));

    const coords = getVesselVisualCoords();
    const NpMax = getNpMax(coords);

    return {
        beta, eta, gamma, X, Ct, m, Cu, f_infty, CL, ReG_ratio, NpMax
    };
}

// Calculate liquid volume based on dish head shape
// H = height of cylindrical section (NOT from deepest point)
function calcLiquidVolume(H = config.H) {
    const R = config.DT / 2;
    const headType = config.headType;

    let h_dish = 0;
    let V_dish = 0;

    if (headType === 'semi-elliptical') {
        h_dish = R / 2;
        V_dish = Math.PI * R * R * R / 3;
    } else if (headType === 'dish') {
        h_dish = 0.1935 * config.DT;
        V_dish = 0.084 * Math.PI * Math.pow(config.DT, 3);
    } else if (headType === 'hemispherical') {
        h_dish = R;
        V_dish = (2 / 3) * Math.PI * R * R * R;
    } else {
        h_dish = 0;
        V_dish = 0;
    }

    // H は円筒部高さなので V_cyl に直接使う（h_dish を引かない）
    const V_cyl = Math.PI * R * R * Math.max(0, H);
    return V_dish + V_cyl;
}

// Return the liquid volume to use for Pv calculation:
// If V_act (measured, in L) > 0, use it (converted from L to m³).
// Otherwise, fall back to the dish-shape-corrected estimate.
function calcLiquidVolumeForPv() {
    if (config.V_act && config.V_act > 0) {
        return config.V_act * 1e-3; // L → m³
    }
    return calcLiquidVolume();
}

function calcLiquidHeightFromVolume(V_m3) {
    if (!(V_m3 > 0)) return config.H;
    const R = config.DT / 2;
    let h_dish = 0;
    if (config.headType === 'semi-elliptical') {
        h_dish = R / 2;
    } else if (config.headType === 'dish') {
        h_dish = 0.1935 * config.DT;
    } else if (config.headType === 'hemispherical') {
        h_dish = R;
    }
    let hi = config.DT + h_dish;
    let lo = 0;
    let mid = hi;
    for (let i = 0; i < 60; i++) {
        mid = (lo + hi) / 2;
        const v = calcLiquidVolume(mid);
        if (v > V_m3) {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    return mid;
}

function getLiquidHeight() {
    let h_dish = 0;
    if (config.headType === 'semi-elliptical') {
        h_dish = config.DT / 4;
    } else if (config.headType === 'dish') {
        h_dish = 0.1935 * config.DT;
    } else if (config.headType === 'hemispherical') {
        h_dish = config.DT / 2;
    }

    if (config.V_act && config.V_act > 0) {
        return calcLiquidHeightFromVolume(config.V_act * 1e-3) + h_dish;
    }
    return config.H + h_dish;
}

function getLiquidVolume() {
    return calcLiquidVolumeForPv();
}

// Calculate the actual number of stages that physically fit in the vessel geometry
// and respect the clearance and the minimum stage gap (1.3 * b)
function getActiveStages() {
    const H = config.H; // 円筒部高さ
    const { clearance, b, n_stage } = config;
    // クリアランスは鏡板最深部から → 有効な円筒部内の高さ = H - (clearance - hb_m) だが
    // 簡略化: インペラは円筒部内に収まる前提で計算
    const max_stages = Math.max(1, Math.floor((H - b) / (1.3 * b)) + 1);
    return Math.min(parseInt(n_stage) || 1, max_stages);
}


function getImpellerStagePositions(coords) {
    const { clearance, b, H } = config;
    const n_stages = getActiveStages();
    const scale = coords.scale;
    const clearance_px = clearance * scale;
    const b_px = b * scale;

    // 最下段: 鏡板最深部 + clearance + b/2
    const y_bottom_impeller = coords.y_deepest - clearance_px - b_px / 2;

    const positions = [];
    if (n_stages === 1) {
        positions.push(y_bottom_impeller);
    } else {
        // 最上段: 鏡板最深部 から config.H 分上 - b/2
        // = diagram.htmlの zBot + zDesignTop - b/2 に相当
        const y_top_impeller = coords.y_deepest - H * scale - b_px / 2;
        const gap_px = (y_bottom_impeller - y_top_impeller) / (n_stages - 1);
        for (let i = 0; i < n_stages; i++) {
            positions.push(y_bottom_impeller - i * gap_px);
        }
    }
    return positions;
}

function getSubmergedImpellerStagePositions(coords) {
    const { y_liquid, scale } = coords;
    const b_px = (config.b || 0) * scale;
    return getImpellerStagePositions(coords).filter(y_imp => (y_imp + b_px / 2) > y_liquid);
}

function getSubmergedImpellerStageFraction(coords) {
    const positions = getImpellerStagePositions(coords);
    if (!positions.length) return 0;
    const b_px = (config.b || 0) * coords.scale;
    let submerged = 0;
    for (const y_imp of positions) {
        const top = y_imp - b_px / 2;
        const bottom = y_imp + b_px / 2;
        // Fully above the liquid surface
        if (bottom <= coords.y_liquid) continue;
        // Fully submerged
        if (top >= coords.y_liquid) {
            submerged += 1;
        } else {
            // Partially submerged
            submerged += (bottom - coords.y_liquid) / b_px;
        }
    }
    return Math.max(0, Math.min(1, submerged / positions.length));
}

function getSubmergedStageCount(coords) {
    const positions = getImpellerStagePositions(coords);
    if (!positions.length) return 0;
    const b_px = (config.b || 0) * coords.scale;
    let count = 0;
    for (const y_imp of positions) {
        const bottom = y_imp + b_px / 2;
        if (bottom > coords.y_liquid) {
            count += 1;
        }
    }
    return count;
}

// Calculate NpMax based on impeller type and multi-stage configuration
function getNpMax(coords) {
    const { impellerType, np, b, d, theta } = config;
    const stageFactor = coords ? getSubmergedImpellerStageFraction(coords) : 1;
    const n_stage_active = getActiveStages() * stageFactor;
    const thetaRad = (theta * Math.PI) / 180;
    let NpMax_1 = 0; // 1-stage NpMax

    if (impellerType === 'flat-paddle' || impellerType === 'flat-turbine') {
        const val = Math.pow(np, 0.7) * (b / d);
        if (val <= 0.54) {
            NpMax_1 = 10 * Math.pow(val, 1.3);
        } else if (val <= 1.6) {
            NpMax_1 = 8.3 * val;
        } else {
            NpMax_1 = 10 * Math.pow(val, 0.6);
        }
    } else if (impellerType === 'pitched-paddle') {
        NpMax_1 = 8.3 * Math.pow((2 * thetaRad) / Math.PI, 0.9) * (Math.pow(np, 0.7) * b * Math.pow(Math.sin(thetaRad), 1.6) / d);
    } else if (impellerType === 'propeller' || impellerType === 'faudler') {
        NpMax_1 = 6.5 * Math.pow(Math.pow(np, 0.7) * b * Math.pow(Math.sin(thetaRad), 1.6) / d, 1.7);
    }

    return NpMax_1 * n_stage_active;
}

// Calculate Np0 (unbaffled) and Np (baffled) for a given Reynolds number
function calculateNpCurve(Re) {
    if (Re <= 0) return { Np0: 0, Np: 0 };

    const coords = getVesselVisualCoords();
    const stageFraction = getSubmergedImpellerStageFraction(coords);
    const vars = getKameiHiraokaIntermediateVars();
    const { beta, Cu, CL, Ct, m, f_infty, ReG_ratio } = vars;
    const { d, DT, H, theta, baffleActive, nB, Bw, impellerType, coilActive, coilOuterDia, coilCenterDia } = config;

    const ReG = ReG_ratio * Re;

    const Cu_ReG = Cu / ReG;
    const bracketTerm = Math.pow(Cu_ReG + ReG, -1);
    const f_ratio_term = Math.pow(f_infty / Ct, 1 / m);

    const f = CL / ReG + Ct * Math.pow(bracketTerm + f_ratio_term, m);

    // Unbaffled Power number Np0
    const volume_factor = 8 * Math.pow(d, 3) / (Math.pow(DT, 2) * H);
    const effectiveStageCount = Math.max(0, getActiveStages() * stageFraction);
    const Np0 = (1.2 * Math.pow(Math.PI, 4) * Math.pow(beta, 2) / volume_factor) * f * effectiveStageCount;

    if (effectiveStageCount <= 0) {
        return { Np0: 0, Np: 0 };
    }

    // Baffled & Coil Power number (Kamei Equation + Kato et al., 2013)
    let baffleTerm = 0;
    if (baffleActive && nB > 0 && Bw > 0) {
        baffleTerm = (Bw / DT) * Math.pow(nB, 0.8);
    }

    if (coilActive) {
        const D_c = (coilCenterDia && coilCenterDia > 0) ? coilCenterDia : 0.7 * DT;
        let coilBw = 0;
        if (D_c / DT > 0.85) {
            const d_co = coilOuterDia ?? 0.010;
            coilBw = 0.25 * d_co;
        } else {
            coilBw = 0.05 * DT;
        }
        baffleTerm += (coilBw / DT) * Math.pow(1, 0.8);
    }

    if (baffleTerm <= 0) {
        return { Np0, Np: Np0 };
    }

    const NpMax = getNpMax(coords);
    if (NpMax <= 0) {
        return { Np0: 0, Np: 0 };
    }

    const thetaRad = (theta * Math.PI) / 180;
    let x = 0;

    if (impellerType === 'flat-paddle' || impellerType === 'flat-turbine') {
        x = (4.5 * baffleTerm) / Math.pow(NpMax, 0.2) + (Np0 / NpMax);
    } else {
        const thetaTerm = Math.pow((2 * thetaRad) / Math.PI, 0.72);
        x = (4.5 * baffleTerm) / (thetaTerm * Math.pow(NpMax, 0.2)) + (Np0 / NpMax);
    }

    let Np = Math.pow(1 + Math.pow(x, -3), -1 / 3) * NpMax;

    // 学術的ルール: 算出された Np が Np0 より小さい場合は Np0 を採用する（層流域での物理的整合性を維持）
    if (Np < Np0) {
        Np = Np0;
    }

    return { Np0, Np };
}

// ----------------------------------------------------
// UI Logic & Recalculations
// ----------------------------------------------------

function updateNStageWarning() {
    const n_stages_requested = parseInt(config.n_stage) || 1;
    const coords = getVesselVisualCoords();
    const n_stage_active = getSubmergedStageCount(coords);
    const warningEl = document.getElementById('n-stage-warning');
    const warningValEl = document.getElementById('n-stage-active-val');
    if (warningEl && warningValEl) {
        if (n_stage_active < n_stages_requested) {
            warningEl.style.display = 'block';
            warningValEl.textContent = n_stage_active;
        } else {
            warningEl.style.display = 'none';
        }
    }
}

function recalculateAll() {
    console.log("recalculateAll started");
    const steps = [
        { name: 'updateNStageWarning', fn: updateNStageWarning },
        { name: 'updateIntermediateVarsUI', fn: updateIntermediateVarsUI },
        { name: 'recalculateExperimentalData', fn: recalculateExperimentalData },
        {
            name: 'syncSpeed', fn: () => {
                if (config.simSpeedSync) {
                    syncSimulatorSpeedWithBlock();
                }
            }
        },
        { name: 'updateChart', fn: updateChart },
        { name: 'updateLowReWarning', fn: updateLowReWarning },
        { name: 'updateSimulatorResults', fn: updateSimulatorResults },
        { name: 'updateHeatCalcUI', fn: updateHeatCalcUI },
        { name: 'updateEffectivePropertiesUI', fn: updateEffectivePropertiesUI },
        { name: 'updateVEstDisplay', fn: updateVEstDisplay },
        { name: 'saveCurrentState', fn: saveCurrentState }
    ];

    steps.forEach(step => {
        try {
            step.fn();
        } catch (e) {
            console.error(`Error in recalculateAll -> ${step.name}:`, e);
        }
    });
    console.log("recalculateAll finished");
}

function updateIntermediateVarsUI() {
    const vars = getKameiHiraokaIntermediateVars();
    const { beta, eta, gamma, X, Ct, m, Cu, f_infty, CL, ReG_ratio, NpMax } = vars;

    const rows = [
        { name: 'β (ベータ)', def: '2ln(D/d) / (D/d - d/D)', val: beta },
        { name: 'η (イータ)', def: '翼付近の循環流量比に関するパラメータ', val: eta },
        { name: 'γ (ガンマ)', def: '流動モデルにおけるせん断幅の係数', val: gamma },
        { name: 'X', def: '動力相関変数', val: X },
        { name: 'Ct', def: '乱流時の形状項係数', val: Ct },
        { name: 'm', def: '遷移域補正指数', val: m },
        { name: 'Cu', def: '層流渦抵抗係数', val: Cu },
        { name: 'f_∞', def: '極限摩擦係数', val: f_infty },
        { name: 'CL', def: '層流抵抗の形状係数', val: CL },
        { name: 'ReG / Re', def: '流動モデルにおけるレイノルズ数比', val: ReG_ratio },
        { name: 'NpMax (段数補正済)', def: '完全邪魔板条件での最大動力数', val: NpMax }
    ];

    const tbody = document.getElementById('calculated-vars-body');
    tbody.innerHTML = '';

    rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.name}</strong></td>
            <td class="text-secondary" style="font-size:0.75rem;">${r.def}</td>
            <td class="calculated-cell highlight-blue">${r.val.toFixed(5)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Dynamic Experimental Blocks Management
function addBlock(opts = {}) {
    const blockId = 'block-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const N_val = opts.N_default || 300;

    const block = {
        id: blockId,
        name: opts.name || `測定ブロック (N = ${N_val} rpm)`,
        rows: []
    };

    // Default 7 rows (time 0 to 60s)
    const times = [0, 10, 20, 30, 40, 50, 60];
    times.forEach(t => {
        block.rows.push({
            time: t,
            N: N_val,
            T: opts.T_default || 0,
            Tb: opts.Tb_default || 0
        });
    });

    expBlocks.push(block);
    renderBlockHTML(block);
    recalculateBlock(blockId);
}

function removeBlock(blockId) {
    expBlocks = expBlocks.filter(b => b.id !== blockId);
    const el = document.getElementById(blockId);
    if (el) el.remove();
    recalculateAll();
}
window.removeBlock = removeBlock;

function renderBlockHTML(block) {
    const container = document.getElementById('blocks-container');
    const blockEl = document.createElement('div');
    blockEl.className = 'block-card';
    blockEl.id = block.id;

    let rowsHTML = '';
    block.rows.forEach((row, idx) => {
        rowsHTML += createRowHTML(row, idx, block.id);
    });

    blockEl.innerHTML = `
        <div class="block-header">
            <div class="block-header-info">
                <h4>
                    <i data-feather="box" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;color:var(--accent-color);"></i>
                    <input type="text" value="${block.name}" oninput="updateBlockName('${block.id}', this.value)" class="block-title-input">
                </h4>
                <div class="block-meta">
                    <span id="${block.id}-meta-re">Re: -</span>
                    <span id="${block.id}-meta-np">Np: -</span>
                    <span id="${block.id}-meta-fr">Fr: -</span>
                </div>
            </div>
            <div class="block-actions">
                <button class="btn btn-secondary" onclick="addEmptyRow('${block.id}')">
                    <i data-feather="plus"></i> 行追加
                </button>
                <button class="btn btn-secondary" style="color:var(--danger-color);border-color:rgba(239, 68, 68, 0.2);" onclick="removeBlock('${block.id}')">
                    <i data-feather="trash-2"></i> ブロック削除
                </button>
            </div>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th width="80">時間 θ (s)</th>
                        <th>回転数 N (rpm)</th>
                        <th>回転数 n (1/s)</th>
                        <th>トルク T (実測) (N·m)</th>
                        <th>トルク Tb (ブランク) (N·m)</th>
                        <th>攪拌所要動力 P (W)</th>
                        <th>正味動力 Pv (W/m³)</th>
                        <th class="col-mu-eff">μ_eff (Pa·s)</th>
                        <th>レイノルズ数 Re (-)</th>
                        <th>動力数 Np (-)</th>
                        <th>フルード数 Fr (-)</th>
                        <th width="50">操作</th>
                    </tr>
                </thead>
                <tbody id="${block.id}-rows">
                    ${rowsHTML}
                </tbody>
                <tfoot>
                    <tr class="ave-row" id="${block.id}-ave-row">
                        <!-- Ave Row values calculated via JS -->
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    container.appendChild(blockEl);
    feather.replace();
}

function createRowHTML(row, idx, blockId) {
    return `
        <tr data-index="${idx}">
            <td><input type="number" value="${row.time}" oninput="updateRowCell('${blockId}', ${idx}, 'time', this.value)" style="width:70px;"></td>
            <td><input type="number" value="${row.N}" oninput="updateRowCell('${blockId}', ${idx}, 'N', this.value)"></td>
            <td id="${blockId}-${idx}-n" class="calculated-cell">0.00</td>
            <td><input type="number" value="${row.T}" step="0.001" oninput="updateRowCell('${blockId}', ${idx}, 'T', this.value)"></td>
            <td><input type="number" value="${row.Tb}" step="0.001" oninput="updateRowCell('${blockId}', ${idx}, 'Tb', this.value)"></td>
            <td id="${blockId}-${idx}-P" class="calculated-cell">0.00</td>
            <td id="${blockId}-${idx}-Pv" class="calculated-cell">0.00</td>
            <td id="${blockId}-${idx}-mu_eff" class="calculated-cell col-mu-eff">0.00</td>
            <td id="${blockId}-${idx}-Re" class="calculated-cell font-weight-bold">0.00</td>
            <td id="${blockId}-${idx}-Np" class="calculated-cell font-weight-bold">0.00</td>
            <td id="${blockId}-${idx}-Fr" class="calculated-cell">0.00</td>
            <td>
                <button class="row-delete-btn" onclick="deleteRow('${blockId}', ${idx})">
                    <i data-feather="x" style="width:16px;height:16px;"></i>
                </button>
            </td>
        </tr>
    `;
}

function updateRowCell(blockId, idx, field, val) {
    const block = expBlocks.find(b => b.id === blockId);
    if (block) {
        block.rows[idx][field] = parseFloat(val) || 0;
        recalculateBlock(blockId);
        updateChart();
    }
}

function updateBlockName(blockId, newName) {
    const block = expBlocks.find(b => b.id === blockId);
    if (block) {
        block.name = newName;
        saveCurrentState();
    }
}

function addEmptyRow(blockId) {
    const block = expBlocks.find(b => b.id === blockId);
    if (block) {
        let lastTime = 0;
        let lastN = 300;
        if (block.rows.length > 0) {
            lastTime = block.rows[block.rows.length - 1].time;
            lastN = block.rows[block.rows.length - 1].N;
        }
        block.rows.push({
            time: lastTime + 10,
            N: lastN,
            T: 0,
            Tb: 0
        });

        // Re-render rows
        const tbody = document.getElementById(`${blockId}-rows`);
        let rowsHTML = '';
        block.rows.forEach((row, idx) => {
            rowsHTML += createRowHTML(row, idx, blockId);
        });
        tbody.innerHTML = rowsHTML;
        feather.replace();

        recalculateBlock(blockId);
        updateChart();
    }
}

function deleteRow(blockId, idx) {
    const block = expBlocks.find(b => b.id === blockId);
    if (block && block.rows.length > 1) {
        block.rows.splice(idx, 1);
        // Re-render
        const tbody = document.getElementById(`${blockId}-rows`);
        let rowsHTML = '';
        block.rows.forEach((row, index) => {
            rowsHTML += createRowHTML(row, index, blockId);
        });
        tbody.innerHTML = rowsHTML;
        feather.replace();

        recalculateBlock(blockId);
        updateChart();
    } else {
        showToast('ブロックには少なくとも1行必要です。', 'error');
    }
}

// Recalculates individual experimental block
function recalculateBlock(blockId) {
    const block = expBlocks.find(b => b.id === blockId);
    if (!block) return;

    const { mu, d, DT, g } = config;
    const rho = getEffectiveDensity();
    const V = calcLiquidVolumeForPv(); // use measured V_act if set, else dish-corrected estimate


    let sumN = 0;
    let sumT = 0;
    let sumTb = 0;

    block.rows.forEach((row, idx) => {
        const n = row.N / 60;
        const mu_eff = calcEffectiveViscosity(n);
        const T_net = row.T - row.Tb;
        const P = 2 * Math.PI * n * T_net;
        const Pv = P / V;
        const Re = calculateReVal(n);
        const Fr = calculateFrVal(n);

        // Power number Np
        let Np = 0;
        if (n > 0 && Math.abs(T_net) > 0) {
            Np = P / (rho * Math.pow(n, 3) * Math.pow(d, 5));
        }

        // Write calculated values back to UI
        document.getElementById(`${blockId}-${idx}-n`).textContent = n.toFixed(3);
        document.getElementById(`${blockId}-${idx}-P`).textContent = P.toFixed(3);
        document.getElementById(`${blockId}-${idx}-Pv`).textContent = Pv.toFixed(1);
        document.getElementById(`${blockId}-${idx}-mu_eff`).textContent = mu_eff.toFixed(4);
        document.getElementById(`${blockId}-${idx}-Re`).textContent = Math.round(Re);
        document.getElementById(`${blockId}-${idx}-Np`).textContent = Np.toFixed(3);
        document.getElementById(`${blockId}-${idx}-Fr`).textContent = Fr.toFixed(3);

        sumN += row.N;
        sumT += row.T;
        sumTb += row.Tb;
    });

    const len = block.rows.length;
    const aveN = sumN / len;
    const aveT = sumT / len;
    const aveTb = sumTb / len;

    const ave_n = aveN / 60;
    const ave_Tnet = aveT - aveTb;
    const ave_mu_eff = calcEffectiveViscosity(ave_n);
    const ave_P = 2 * Math.PI * ave_n * ave_Tnet;
    const ave_Pv = ave_P / V;
    const ave_Re = calculateReVal(ave_n);
    const ave_Fr = calculateFrVal(ave_n);
    let ave_Np = 0;
    if (ave_n > 0 && Math.abs(ave_Tnet) > 0) {
        ave_Np = ave_P / (rho * Math.pow(ave_n, 3) * Math.pow(d, 5));
    }

    // Save calculation to block object for plotting
    block.aveCalculated = {
        Re: ave_Re,
        Np: ave_Np,
        Fr: ave_Fr,
        N: aveN,
        P: ave_P,
        Pv: ave_Pv
    };

    // Render Average Row
    const aveRowEl = document.getElementById(`${blockId}-ave-row`);
    aveRowEl.innerHTML = `
        <td>Ave</td>
        <td class="highlight-amber">${aveN.toFixed(1)}</td>
        <td>${ave_n.toFixed(3)}</td>
        <td class="highlight-amber">${aveT.toFixed(3)}</td>
        <td class="highlight-amber">${aveTb.toFixed(5)}</td>
        <td class="highlight-green">${ave_P.toFixed(3)}</td>
        <td>${ave_Pv.toFixed(1)}</td>
        <td class="calculated-cell highlight-blue">${ave_mu_eff.toFixed(4)}</td>
        <td class="calculated-cell highlight-blue">${Math.round(ave_Re)}</td>
        <td class="calculated-cell highlight-blue">${ave_Np.toFixed(2)}</td>
        <td class="calculated-cell highlight-blue">${ave_Fr.toFixed(2)}</td>
        <td></td>
    `;

    // Update Header Meta
    document.getElementById(`${blockId}-meta-re`).innerHTML = `Re: <strong>${Math.round(ave_Re)}</strong>`;
    document.getElementById(`${blockId}-meta-np`).innerHTML = `Np: <strong>${ave_Np.toFixed(2)}</strong>`;
    document.getElementById(`${blockId}-meta-fr`).innerHTML = `Fr: <strong>${ave_Fr.toFixed(2)}</strong>`;
    updateLowReWarning();
}

function updateLowReWarning() {
    const warningEl = document.getElementById('low-re-warning');
    if (!warningEl) return;

    const hasLowRe = expBlocks.some(block => block.rows.some(row => {
        const n = row.N / 60;
        if (n <= 0) return false;
        const Re = calculateReVal(n);
        return Re > 0 && Re < 10;
    }));

    warningEl.style.display = hasLowRe ? 'flex' : 'none';
}

// chartAreaBorder plugin to draw chart outer frame
const chartAreaBorder = {
    id: 'chartAreaBorder',
    afterDraw(chart) {
        const { ctx, chartArea: { top, right, bottom, left, width, height } } = chart;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; // Bright Frame color for premium look
        ctx.lineWidth = 2.0; // Slightly thicker
        ctx.strokeRect(left, top, width, height);
        ctx.restore();
    }
};

// chartRegions plugin to draw Laminar, Transitional, and Turbulent regions on main screen (dark mode)
const chartRegions = {
    id: 'chartRegions',
    beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right, height }, scales: { x } } = chart;
        if (!x) return;
        ctx.save();

        const laminarBoundary = 10;
        const turbulentBoundary = 1000;

        const xLaminar = x.getPixelForValue(laminarBoundary);
        const xTurbulent = x.getPixelForValue(turbulentBoundary);

        const pLaminar = Math.max(left, Math.min(right, xLaminar));
        const pTurbulent = Math.max(left, Math.min(right, xTurbulent));

        // Draw background bands (faint white/gray overlay for dark theme)
        if (pLaminar > left) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
            ctx.fillRect(left, top, pLaminar - left, height);
        }
        if (pTurbulent > pLaminar) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(pLaminar, top, pTurbulent - pLaminar, height);
        }
        if (right > pTurbulent) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
            ctx.fillRect(pTurbulent, top, right - pTurbulent, height);
        }

        // Draw boundary dashed lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);

        if (xLaminar >= left && xLaminar <= right) {
            ctx.beginPath();
            ctx.moveTo(xLaminar, top);
            ctx.lineTo(xLaminar, bottom);
            ctx.stroke();
        }
        if (xTurbulent >= left && xTurbulent <= right) {
            ctx.beginPath();
            ctx.moveTo(xTurbulent, top);
            ctx.lineTo(xTurbulent, bottom);
            ctx.stroke();
        }

        // Draw Region labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = 'bold 11px Inter, Outfit, Noto Sans JP, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const drawLabel = (textLines, xCenter, yStart) => {
            textLines.forEach((line, index) => {
                ctx.fillText(line, xCenter, yStart + index * 14);
            });
        };

        const labelY = top + 12;

        if (pLaminar > left && (pLaminar - left) > 50) {
            drawLabel(['層流域', 'Re ≦ 10'], (left + pLaminar) / 2, labelY);
        }
        if (pTurbulent > pLaminar && (pTurbulent - pLaminar) > 50) {
            drawLabel(['遷移域', '10 < Re < 10³'], (pLaminar + pTurbulent) / 2, labelY);
        }
        if (right > pTurbulent && (right - pTurbulent) > 50) {
            drawLabel(['乱流域', 'Re ≧ 10³'], (pTurbulent + right) / 2, labelY);
        }

        ctx.restore();
    }
};

// lightChartRegions plugin to draw Laminar, Transitional, and Turbulent regions on PDF chart (light mode)
const lightChartRegions = {
    id: 'lightChartRegions',
    beforeDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right, height }, scales: { x } } = chart;
        if (!x) return;
        ctx.save();

        const laminarBoundary = 10;
        const turbulentBoundary = 1000;

        const xLaminar = x.getPixelForValue(laminarBoundary);
        const xTurbulent = x.getPixelForValue(turbulentBoundary);

        const pLaminar = Math.max(left, Math.min(right, xLaminar));
        const pTurbulent = Math.max(left, Math.min(right, xTurbulent));

        // Draw background bands (faint dark overlay for light theme)
        if (pLaminar > left) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
            ctx.fillRect(left, top, pLaminar - left, height);
        }
        if (pTurbulent > pLaminar) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            ctx.fillRect(pLaminar, top, pTurbulent - pLaminar, height);
        }
        if (right > pTurbulent) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.045)';
            ctx.fillRect(pTurbulent, top, right - pTurbulent, height);
        }

        // Draw boundary dashed lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);

        if (xLaminar >= left && xLaminar <= right) {
            ctx.beginPath();
            ctx.moveTo(xLaminar, top);
            ctx.lineTo(xLaminar, bottom);
            ctx.stroke();
        }
        if (xTurbulent >= left && xTurbulent <= right) {
            ctx.beginPath();
            ctx.moveTo(xTurbulent, top);
            ctx.lineTo(xTurbulent, bottom);
            ctx.stroke();
        }

        // Draw Region labels
        ctx.fillStyle = 'rgba(17, 24, 39, 0.65)'; // Dark text
        ctx.font = 'bold 10px Inter, Outfit, Noto Sans JP, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const drawLabel = (textLines, xCenter, yStart) => {
            textLines.forEach((line, index) => {
                ctx.fillText(line, xCenter, yStart + index * 13);
            });
        };

        const labelY = top + 10;

        if (pLaminar > left && (pLaminar - left) > 50) {
            drawLabel(['層流域', 'Re ≦ 10'], (left + pLaminar) / 2, labelY);
        }
        if (pTurbulent > pLaminar && (pTurbulent - pLaminar) > 50) {
            drawLabel(['遷移域', '10 < Re < 10³'], (pLaminar + pTurbulent) / 2, labelY);
        }
        if (right > pTurbulent && (right - pTurbulent) > 50) {
            drawLabel(['乱流域', 'Re ≧ 10³'], (pTurbulent + right) / 2, labelY);
        }

        ctx.restore();
    }
};

// chartNjsLabel plugin to draw label next to Njs point on main screen chart
const chartNjsLabel = {
    id: 'chartNjsLabel',
    afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        if (!x || !y) return;

        const njsDataset = chart.data.datasets.find(ds => ds.label === '完全浮遊限界速度 Njs');
        if (!njsDataset || !njsDataset.data || njsDataset.data.length === 0) return;

        const pt = njsDataset.data[0];
        const px = x.getPixelForValue(pt.x);
        const py = y.getPixelForValue(pt.y);

        if (px === undefined || py === undefined) return;

        ctx.save();
        const text = 'Njs (完全浮遊)';
        ctx.font = 'bold 11px Inter, Outfit, Noto Sans JP, sans-serif';
        const textWidth = ctx.measureText(text).width;

        // Draw background pill to mask overlapping elements
        ctx.fillStyle = 'rgba(11, 15, 25, 0.92)'; // Dark background matching theme
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; // Red border matching dot
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(px + 12, py - 9, textWidth + 12, 18, 4);
        } else {
            ctx.rect(px + 12, py - 9, textWidth + 12, 18);
        }
        ctx.fill();
        ctx.stroke();

        // Draw white text inside the pill
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, px + 18, py);
        ctx.restore();
    }
};

// chartSimSpeedLine plugin to draw vertical line at current simulation Reynolds number
const chartSimSpeedLine = {
    id: 'chartSimSpeedLine',
    afterDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;
        if (!x) return;

        const n_sim = (config.simSpeed ?? 300) / 60;
        const Re_sim = calculateReVal(n_sim);

        if (Re_sim >= x.min && Re_sim <= x.max) {
            const px = x.getPixelForValue(Re_sim);
            if (px >= left && px <= right) {
                ctx.save();
                ctx.strokeStyle = '#06b6d4'; // Cyan matching current speed theme
                ctx.lineWidth = 2.0;
                ctx.setLineDash([4, 4]); // Dashed line

                ctx.beginPath();
                ctx.moveTo(px, top);
                ctx.lineTo(px, bottom);
                ctx.stroke();

                // Calculate Np and Pv (Sv) from curve
                const { Np } = calculateNpCurve(Re_sim);
                const effRho = getEffectiveDensity();
                const d = config.d || 0.060;
                const V_liq = calcLiquidVolumeForPv() || 0.001;
                const P_sim = Np * effRho * Math.pow(n_sim, 3) * Math.pow(d, 5);
                const Pv_sim = P_sim / V_liq;

                const lines = [
                    'シミュレーション値',
                    `Re: ${Math.round(Re_sim).toLocaleString()}`,
                    `Np: ${Np.toFixed(3)}`,
                    `Pv: ${Pv_sim.toFixed(1)} W/m³`
                ];

                ctx.font = 'bold 9px Inter, Outfit, Noto Sans JP, sans-serif';

                // Calculate max width among all lines
                let maxWidth = 0;
                lines.forEach(line => {
                    const w = ctx.measureText(line).width;
                    if (w > maxWidth) maxWidth = w;
                });

                const pillWidth = maxWidth + 12;
                const pillHeight = lines.length * 12 + 8; // 4 * 12 + 8 = 56px
                const halfWidth = pillWidth / 2;
                const pillX = Math.max(left + halfWidth, Math.min(right - halfWidth, px));

                // Draw background pill
                ctx.fillStyle = 'rgba(11, 15, 25, 0.9)'; // Dark semi-transparent
                ctx.fillRect(pillX - halfWidth, top + 32, pillWidth, pillHeight);

                // Draw lines of text
                ctx.fillStyle = '#06b6d4';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                lines.forEach((line, index) => {
                    ctx.fillText(line, pillX, top + 36 + index * 12);
                });
                ctx.restore();
            }
        }
    }
};

// lightChartNjsLabel plugin to draw label next to Njs point on PDF chart
const lightChartNjsLabel = {
    id: 'lightChartNjsLabel',
    afterDatasetsDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        if (!x || !y) return;

        const njsDataset = chart.data.datasets.find(ds => ds.label === '完全浮遊限界速度 Njs');
        if (!njsDataset || !njsDataset.data || njsDataset.data.length === 0) return;

        const pt = njsDataset.data[0];
        const px = x.getPixelForValue(pt.x);
        const py = y.getPixelForValue(pt.y);

        if (px === undefined || py === undefined) return;

        ctx.save();
        const text = 'Njs (完全浮遊)';
        ctx.font = 'bold 9px Inter, Outfit, Noto Sans JP, sans-serif';
        const textWidth = ctx.measureText(text).width;

        // Draw light background pill for print mode
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(px + 10, py - 8, textWidth + 10, 16, 3);
        } else {
            ctx.rect(px + 10, py - 8, textWidth + 10, 16);
        }
        ctx.fill();
        ctx.stroke();

        // Draw dark text inside the pill
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, px + 15, py);
        ctx.restore();
    }
};

// lightChartSimSpeedLine plugin for PDF (light mode)
const lightChartSimSpeedLine = {
    id: 'lightChartSimSpeedLine',
    afterDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;
        if (!x) return;

        const n_sim = (config.simSpeed ?? 300) / 60;
        const Re_sim = calculateReVal(n_sim);

        if (Re_sim >= x.min && Re_sim <= x.max) {
            const px = x.getPixelForValue(Re_sim);
            if (px >= left && px <= right) {
                ctx.save();
                ctx.strokeStyle = '#0891b2'; // Slightly darker cyan for print contrast
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);

                ctx.beginPath();
                ctx.moveTo(px, top);
                ctx.lineTo(px, bottom);
                ctx.stroke();

                // Calculate Np and Pv (Sv) from curve
                const { Np } = calculateNpCurve(Re_sim);
                const effRho = getEffectiveDensity();
                const d = config.d || 0.060;
                const V_liq = calcLiquidVolumeForPv() || 0.001;
                const P_sim = Np * effRho * Math.pow(n_sim, 3) * Math.pow(d, 5);
                const Pv_sim = P_sim / V_liq;

                const lines = [
                    'シミュレーション値',
                    `Re: ${Math.round(Re_sim).toLocaleString()}`,
                    `Np: ${Np.toFixed(3)}`,
                    `Pv: ${Pv_sim.toFixed(1)} W/m³`
                ];

                ctx.font = 'bold 8px Inter, Noto Sans JP, sans-serif';

                let maxWidth = 0;
                lines.forEach(line => {
                    const w = ctx.measureText(line).width;
                    if (w > maxWidth) maxWidth = w;
                });

                const pillWidth = maxWidth + 8;
                const pillHeight = lines.length * 10 + 6;
                const halfWidth = pillWidth / 2;
                const pillX = Math.max(left + halfWidth, Math.min(right - halfWidth, px));

                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent white
                ctx.fillRect(pillX - halfWidth, top + 28, pillWidth, pillHeight);

                ctx.fillStyle = '#0891b2';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                lines.forEach((line, index) => {
                    ctx.fillText(line, pillX, top + 31 + index * 10);
                });
                ctx.restore();
            }
        }
    }
};

function recalculateExperimentalData() {
    expBlocks.forEach(b => {
        recalculateBlock(b.id);
    });
}

// ============================================================
// Rheology: effective viscosity (Metzner-Otto method)
// ============================================================

function calcEffectiveViscosity(n_rps) {
    const m = rheologyData.activeModel;
    const modelList = rheologyData.samples[rheologyData.activeSample] || [];
    const p = modelList.find(r => r.modelId === m);
    const ks = rheologyData.ks || 11.5;
    const gamma_dot = ks * n_rps;

    if (!p || m === 'newtonian') return config.mu;

    const pr = p.params;
    switch (m) {
        case 'powerlaw':
            if (pr.K > 0 && pr.n > 0 && n_rps > 0)
                return pr.K * Math.pow(gamma_dot, pr.n - 1);
            break;
        case 'bingham':
            if (n_rps > 0) return pr.tau_y / gamma_dot + pr.eta_p;
            break;
        case 'casson':
            if (n_rps > 0) {
                const s = Math.sqrt(pr.eta_p) + Math.sqrt(pr.tau_y / gamma_dot);
                return s * s;
            }
            break;
        case 'hb':
            if (n_rps > 0)
                return pr.tau_y / gamma_dot + pr.K * Math.pow(gamma_dot, pr.n - 1);
            break;
        case 'cross':
            return pr.eta_inf + (pr.eta_0 - pr.eta_inf) / (1 + Math.pow(pr.K * gamma_dot, pr.m));
        case 'carreau':
            return pr.eta_inf + (pr.eta_0 - pr.eta_inf) *
                Math.pow(1 + Math.pow(pr.lambda * gamma_dot, 2), (pr.n - 1) / 2);
        default:
            break;
    }
    return config.mu;
}

function calcKsMetznerOtto() {
    const m = rheologyData.activeModel;
    const modelList = rheologyData.samples[rheologyData.activeSample] || [];
    const p = modelList.find(r => r.modelId === m);
    if (!p || m === 'newtonian') return null;
    const pr = p.params;
    const { rho, d } = config;
    const ksValues = [];

    function invertNpToRe(Np_exp) {
        if (Np_exp <= 0) return null;
        let lo = 0.01, hi = 1e7;
        for (let i = 0; i < 80; i++) {
            const mid = (lo + hi) / 2;
            if (calculateNpCurve(mid) > Np_exp) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
    }

    expBlocks.forEach(block => {
        block.rows.forEach(row => {
            const n = row.N / 60;
            const T_net = row.T - row.Tb;
            if (n <= 0 || T_net <= 0) return;
            const P = 2 * Math.PI * n * T_net;
            const Np_exp = P / (rho * Math.pow(n, 3) * Math.pow(d, 5));
            const Re_eff = invertNpToRe(Np_exp);
            if (!Re_eff) return;
            const mu_eff = rho * n * d * d / Re_eff;
            if (mu_eff <= 0) return;

            function residual(gd) {
                switch (m) {
                    case 'powerlaw': return pr.K * Math.pow(gd, pr.n - 1) - mu_eff;
                    case 'bingham': return pr.tau_y / gd + pr.eta_p - mu_eff;
                    case 'casson': { const s = Math.sqrt(pr.eta_p) + Math.sqrt(pr.tau_y / gd); return s * s - mu_eff; }
                    case 'hb': return pr.tau_y / gd + pr.K * Math.pow(gd, pr.n - 1) - mu_eff;
                    case 'cross': return pr.eta_inf + (pr.eta_0 - pr.eta_inf) / (1 + Math.pow(pr.K * gd, pr.m)) - mu_eff;
                    case 'carreau': return pr.eta_inf + (pr.eta_0 - pr.eta_inf) * Math.pow(1 + Math.pow(pr.lambda * gd, 2), (pr.n - 1) / 2) - mu_eff;
                    default: return NaN;
                }
            }
            const r_lo = residual(0.01), r_hi = residual(1e6);
            if (isNaN(r_lo) || isNaN(r_hi) || r_lo * r_hi > 0) return;
            let blo = 0.01, bhi = 1e6;
            for (let i = 0; i < 80; i++) {
                const mid = (blo + bhi) / 2;
                if (residual(mid) * r_lo > 0) blo = mid; else bhi = mid;
            }
            const gamma_dot = (blo + bhi) / 2;
            if (gamma_dot > 0 && n > 0) ksValues.push(gamma_dot / n);
        });
    });

    if (ksValues.length === 0) return null;
    const ksMean = ksValues.reduce((a, b) => a + b, 0) / ksValues.length;
    const ksStd = Math.sqrt(ksValues.reduce((a, b) => a + (b - ksMean) ** 2, 0) / ksValues.length);
    return { ksValues, ksMean, ksStd };
}

// ============================================================
// Rheology CSV import
// ============================================================

function processRheologyCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const dataLines = lines.filter(l => l.trim() && !l.startsWith('#'));
    if (dataLines.length < 2) { showToast('CSVの形式が不正です', 'error'); return; }

    const headers = dataLines[0].split(',').map(h => h.trim());
    const idx = {};
    headers.forEach((h, i) => { idx[h] = i; });

    const MODEL_ID_MAP = {
        'Newtonian': 'newtonian', 'Bingham': 'bingham', 'Casson': 'casson',
        'Power-law': 'powerlaw', 'Herschel-Bulkley': 'hb', 'Cross': 'cross', 'Carreau': 'carreau'
    };

    const samples = {};
    dataLines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const cols = [];
        let cur = '', inQ = false;
        for (const ch of line) {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
            else cur += ch;
        }
        cols.push(cur);
        const clean = cols.map(c => c.trim());
        const sampleName = clean[idx['Sample']] || '';
        const modelName = clean[idx['Model']] || '';
        const modelId = MODEL_ID_MAP[modelName] || modelName.toLowerCase();
        const g = key => { const x = parseFloat(clean[idx[key]]); return isNaN(x) ? undefined : x; };

        const params = {};
        if (g('eta_0_Pas') !== undefined) params.eta_0 = g('eta_0_Pas');
        if (g('tau_y_Pa') !== undefined) params.tau_y = g('tau_y_Pa');
        if (g('eta_p_Pas') !== undefined) params.eta_p = g('eta_p_Pas');
        if (g('K_Pasn') !== undefined) params.K = g('K_Pasn');
        if (g('n_flow') !== undefined) params.n = g('n_flow');
        if (g('lambda_s') !== undefined) params.lambda = g('lambda_s');
        if (g('m_cross') !== undefined) params.m = g('m_cross');
        if (g('eta_inf_Pas') !== undefined) params.eta_inf = g('eta_inf_Pas');

        if (!samples[sampleName]) samples[sampleName] = [];
        samples[sampleName].push({
            modelId, name: modelName,
            rating: clean[idx['Rating']] || '',
            r2: parseFloat(clean[idx['R2']]) || 0,
            rmse: parseFloat(clean[idx['RMSE_Pa']]) || 0,
            mae: parseFloat(clean[idx['MAE_Pa']]) || 0,
            params
        });
    });

    if (Object.keys(samples).length === 0) { showToast('有効なデータが見つかりません', 'error'); return; }
    rheologyData.samples = samples;
    rheologyData.activeSample = Object.keys(samples)[0];
    rheologyData.activeModel = 'newtonian';
    updateRheologyUI();
    recalculateAll();
    showToast('レオロジーデータを読み込みました', 'success');
}

function loadRheologyCSV(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        processRheologyCSV(e.target.result);
    };
    reader.readAsText(file);
}

function updateRheologyUI() {
    const sampleSel = document.getElementById('rheology-sample-select');
    const modelSel = document.getElementById('rheology-model-select');
    const muEffDiv = document.getElementById('mu-eff-display');
    const ksGroup = document.getElementById('ks-group');
    const muEffContainer = document.getElementById('mu-eff-container');
    const clearBtn = document.getElementById('btn-clear-rheology');

    const samples = Object.keys(rheologyData.samples);
    if (samples.length === 0) {
        if (clearBtn) clearBtn.style.display = 'none';
        sampleSel.innerHTML = '<option value="">-- CSV未読込 --</option>';
        sampleSel.disabled = true; sampleSel.style.opacity = '0.5';
        modelSel.innerHTML = '<option value="newtonian">Newtonian（μ = 一定）</option>';
        if (muEffContainer) muEffContainer.style.display = 'none';
        ksGroup.style.opacity = '0.4';
        return;
    }

    if (clearBtn) clearBtn.style.display = 'inline-flex';
    sampleSel.innerHTML = samples.map(s =>
        `<option value="${s}"${s === rheologyData.activeSample ? ' selected' : ''}>${s}</option>`).join('');
    sampleSel.disabled = false; sampleSel.style.opacity = '1';

    const modelRows = rheologyData.samples[rheologyData.activeSample] || [];
    const ICON = { excellent: '◎', good: '○', fair: '△', poor: '×', invalid: '×', insufficient: '―' };
    let opts = `<option value="newtonian"${rheologyData.activeModel === 'newtonian' ? ' selected' : ''}>◎ Newtonian（μ = ${config.mu} Pa·s）</option>`;
    modelRows.forEach(r => {
        if (r.modelId === 'newtonian') {
            opts = `<option value="newtonian"${rheologyData.activeModel === 'newtonian' ? ' selected' : ''}>${ICON[r.rating] || '-'} Newtonian μ=${r.params.eta_0 ? r.params.eta_0.toFixed(4) : config.mu} Pa·s [R²=${r.r2.toFixed(4)}]</option>`;
            return;
        }
        opts += `<option value="${r.modelId}"${r.modelId === rheologyData.activeModel ? ' selected' : ''}>${ICON[r.rating] || '-'} ${r.name} [R²=${r.r2.toFixed(4)}]</option>`;
    });
    modelSel.innerHTML = opts;

    const isNewt = rheologyData.activeModel === 'newtonian';
    // ニュートン流体が選択されている場合は、UI の mu 入力値を保持（CSV の eta_0 は使わない）
    // 非ニュートン流体が選択されている場合も、config.mu は上書きしない（ベース液粘度として保持）
    const selectedModelInfo = rheologyData.samples[rheologyData.activeSample]?.find(r => r.modelId === rheologyData.activeModel);
    // NOTE: config.mu はユーザー入力値として保持し、レオロジーデータ選択時に上書きしない

    // μ_eff 列の表示/非表示を制御
    const muEffCells = document.querySelectorAll('.col-mu-eff');
    muEffCells.forEach(cell => {
        cell.style.display = isNewt ? 'none' : 'table-cell';
    });

    const cavernModelGroup = document.getElementById('cavern-model-group');
    if (cavernModelGroup) {
        const isYieldFluid = rheologyData.activeModel === 'bingham' || rheologyData.activeModel === 'casson' || rheologyData.activeModel === 'hb';
        cavernModelGroup.style.display = isYieldFluid ? 'block' : 'none';
    }

    let allN = [];
    expBlocks.forEach(b => b.rows.forEach(r => { if (r.N > 0) allN.push(r.N / 60); }));
    const n_rep = allN.length > 0 ? allN.reduce((a, b) => a + b, 0) / allN.length : 100 / 60;
    const mu_eff = calcEffectiveViscosity(n_rep);

    if (isNewt) {
        ksGroup.style.display = 'none';
        if (muEffContainer) muEffContainer.style.display = 'none';
    } else {
        ksGroup.style.display = 'block';
        if (muEffContainer) {
            muEffContainer.style.display = 'flex';
            muEffContainer.style.flexDirection = 'column';
            if (muEffDiv) {
                muEffDiv.style.display = 'block';
                muEffDiv.innerHTML = `${mu_eff.toFixed(4)} <span style="font-size:0.75rem;">(N≈${(n_rep * 60).toFixed(0)}rpm)</span>`;
            }
        }
    }
}

function initRheologyListeners() {
    document.getElementById('rheology-csv-input').addEventListener('change', e => {
        if (e.target.files[0]) loadRheologyCSV(e.target.files[0]);
        e.target.value = '';
    });
    const clearBtn = document.getElementById('btn-clear-rheology');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            rheologyData = { samples: {}, activeSample: null, activeModel: 'newtonian', ks: 11.5 };
            updateRheologyUI();
            recalculateAll();
            showToast('レオロジーデータをクリアしました', 'info');
        });
    }
    document.getElementById('rheology-sample-select').addEventListener('change', e => {
        rheologyData.activeSample = e.target.value;
        rheologyData.activeModel = 'newtonian';
        updateRheologyUI();
        recalculateAll();
    });
    document.getElementById('rheology-model-select').addEventListener('change', e => {
        rheologyData.activeModel = e.target.value;
        updateRheologyUI();
        recalculateAll();
    });
    document.getElementById('ks-input').addEventListener('input', e => {
        rheologyData.ks = parseFloat(e.target.value) || 11.5;
        updateRheologyUI();
        recalculateAll();
    });
    const cavernModelSelect = document.getElementById('cavern-model');
    if (cavernModelSelect) {
        cavernModelSelect.addEventListener('change', e => {
            config.cavernModel = e.target.value;
            // α入力の表示切替
            const cavernAlphaGroup = document.getElementById('cavern-alpha-group');
            if (cavernAlphaGroup) {
                cavernAlphaGroup.style.display = e.target.value === 'cylindrical' ? 'block' : 'none';
            }
            saveCurrentState();
            recalculateAll();
        });
    }
}

function calculateReVal(n) {
    return (getEffectiveDensity() * n * Math.pow(config.d, 2)) / calcEffectiveViscosity(n);
}

function calculateFrVal(n) {
    return (Math.pow(n, 2) * config.DT) / config.g;
}

// ----------------------------------------------------
// Graph / Charting (Chart.js log-log support)
// ----------------------------------------------------

function initChart() {
    const ctx = document.getElementById('rushtonChart').getContext('2d');

    // Draw empty grid
    chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: []
        },
        plugins: [chartAreaBorder, chartRegions, chartNjsLabel, chartSimSpeedLine],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 400
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#f3f4f6',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: (Re: ${context.raw.x.toFixed(1)}, Np: ${context.raw.y.toFixed(3)})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'レイノルズ数 Re [-]',
                        color: '#f3f4f6',
                        font: {
                            family: 'Outfit',
                            size: 14,
                            weight: 600
                        }
                    },
                    border: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.6)',
                        width: 2.0
                    },
                    grid: {
                        color: function (context) {
                            if (!context.tick) return 'rgba(255, 255, 255, 0.05)';
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 'rgba(255, 255, 255, 0.45)'; // Bright Major gridline
                            }
                            return 'rgba(255, 255, 255, 0.22)'; // Clear Minor gridline
                        },
                        lineWidth: function (context) {
                            if (!context.tick) return 1;
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 1.2;
                            }
                            return 0.8;
                        },
                        tickColor: function (context) {
                            if (!context.tick) return 'rgba(255, 255, 255, 0.15)';
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 'rgba(255, 255, 255, 0.7)';
                            }
                            return 'rgba(255, 255, 255, 0.35)';
                        },
                        tickLength: function (context) {
                            if (!context.tick) return 6;
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 8; // Longer major tick
                            }
                            return 4; // Shorter minor tick
                        }
                    },
                    ticks: {
                        color: '#f3f4f6',
                        callback: function (value) {
                            const log10 = Math.log10(value);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return '10' + getSuperScript(Math.round(log10));
                            }
                            return ''; // Return empty string so the tick and gridline are preserved
                        }
                    },
                    afterBuildTicks: function (scale) {
                        const ticks = [];
                        const minVal = (scale.min !== undefined && scale.min !== null && !isNaN(scale.min)) ? scale.min : ((scale.dataMin !== undefined && scale.dataMin !== null) ? scale.dataMin : 1.0);
                        const maxVal = (scale.max !== undefined && scale.max !== null && !isNaN(scale.max)) ? scale.max : ((scale.dataMax !== undefined && scale.dataMax !== null) ? scale.dataMax : 100000000);
                        const minLog = Math.floor(Math.log10(minVal));
                        const maxLog = Math.ceil(Math.log10(maxVal));
                        for (let log = minLog; log <= maxLog; log++) {
                            const base = Math.pow(10, log);
                            for (let i = 1; i <= 9; i++) {
                                const val = base * i;
                                if (val >= minVal && val <= maxVal) {
                                    ticks.push({
                                        value: val,
                                        major: (i === 1)
                                    });
                                }
                            }
                        }
                        scale.ticks = ticks;
                    },
                    min: 1,
                    max: 100000000
                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: '動力数 Np [-]',
                        color: '#f3f4f6',
                        font: {
                            family: 'Outfit',
                            size: 14,
                            weight: 600
                        }
                    },
                    border: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.6)',
                        width: 2.0
                    },
                    grid: {
                        color: function (context) {
                            if (!context.tick) return 'rgba(255, 255, 255, 0.05)';
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 'rgba(255, 255, 255, 0.45)'; // Bright Major gridline
                            }
                            return 'rgba(255, 255, 255, 0.22)'; // Clear Minor gridline
                        },
                        lineWidth: function (context) {
                            if (!context.tick) return 1;
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 1.2;
                            }
                            return 0.8;
                        },
                        tickColor: function (context) {
                            if (!context.tick) return 'rgba(255, 255, 255, 0.15)';
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 'rgba(255, 255, 255, 0.7)';
                            }
                            return 'rgba(255, 255, 255, 0.35)';
                        },
                        tickLength: function (context) {
                            if (!context.tick) return 6;
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 8; // Longer major tick
                            }
                            return 4; // Shorter minor tick
                        }
                    },
                    ticks: {
                        color: '#f3f4f6',
                        callback: function (value) {
                            const log10 = Math.log10(value);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return '10' + getSuperScript(Math.round(log10));
                            }
                            return ''; // Return empty string so the tick and gridline are preserved
                        }
                    },
                    afterBuildTicks: function (scale) {
                        const ticks = [];
                        const minVal = (scale.min !== undefined && scale.min !== null && !isNaN(scale.min)) ? scale.min : ((scale.dataMin !== undefined && scale.dataMin !== null) ? scale.dataMin : 0.01);
                        const maxVal = (scale.max !== undefined && scale.max !== null && !isNaN(scale.max)) ? scale.max : ((scale.dataMax !== undefined && scale.dataMax !== null) ? scale.dataMax : 100);
                        const minLog = Math.floor(Math.log10(minVal));
                        const maxLog = Math.ceil(Math.log10(maxVal));
                        for (let log = minLog; log <= maxLog; log++) {
                            const base = Math.pow(10, log);
                            for (let i = 1; i <= 9; i++) {
                                const val = base * i;
                                if (val >= minVal && val <= maxVal) {
                                    ticks.push({
                                        value: val,
                                        major: (i === 1)
                                    });
                                }
                            }
                        }
                        scale.ticks = ticks;
                    },
                    min: document.getElementById('chart-ymin') && document.getElementById('chart-ymin').value !== 'auto' ? parseFloat(document.getElementById('chart-ymin').value) : undefined,
                    max: document.getElementById('chart-ymax') && document.getElementById('chart-ymax').value !== 'auto' ? parseFloat(document.getElementById('chart-ymax').value) : undefined
                }
            }
        }
    });
}

function getSuperScript(num) {
    const superscripts = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '-': '⁻'
    };
    return num.toString().split('').map(c => superscripts[c] || c).join('');
}

function updateChart() {
    if (!chart) {
        initChart();
        const ymin = document.getElementById('chart-ymin') && document.getElementById('chart-ymin').value !== 'auto' ? parseFloat(document.getElementById('chart-ymin').value) : undefined;
        const ymax = document.getElementById('chart-ymax') && document.getElementById('chart-ymax').value !== 'auto' ? parseFloat(document.getElementById('chart-ymax').value) : undefined;
        chart.options.scales.y.min = ymin;
        chart.options.scales.y.max = ymax;
    }

    // 1. Generate Experimental Dots & Find Re Range
    let minRe = 0.1;
    let maxRe = 100000;
    const expDots = [];
    const expDotsBase = [];
    const isNewt = (rheologyData.activeModel === 'newtonian' || !rheologyData.activeModel);

    expBlocks.forEach(b => {
        if (b.aveCalculated && b.aveCalculated.Re > 0 && b.aveCalculated.Np > 0) {
            expDots.push({
                x: b.aveCalculated.Re,
                y: b.aveCalculated.Np,
                N: b.aveCalculated.N
            });
            if (b.aveCalculated.Re < minRe) minRe = b.aveCalculated.Re;
            if (b.aveCalculated.Re > maxRe) maxRe = b.aveCalculated.Re;

            if (!isNewt) {
                const n_rps = b.aveCalculated.N / 60;
                const Re_base = (getEffectiveDensity() * n_rps * Math.pow(config.d, 2)) / config.mu;
                if (Re_base > 0) {
                    expDotsBase.push({
                        x: Re_base,
                        y: b.aveCalculated.Np,
                        N: b.aveCalculated.N
                    });
                    if (Re_base < minRe) minRe = Re_base;
                    if (Re_base > maxRe) maxRe = Re_base;
                }
            }
        }
    });

    // レイノルズ数表示範囲を 10^0 (1) 以上 10^8 (100,000,000) までに固定
    const startLog = 0;
    const endLog = 8;
    chart.options.scales.x.min = Math.pow(10, startLog);
    chart.options.scales.x.max = Math.pow(10, endLog);

    // 2. Generate Prediction Curves
    const unbaffledData = [];
    const baffledData = [];
    const maxData = [];
    const stepsPerDecade = 25;
    const vars = getKameiHiraokaIntermediateVars();
    const NpMax = vars.NpMax;

    for (let i = startLog * stepsPerDecade; i <= endLog * stepsPerDecade; i++) {
        const Re = Math.pow(10, i / stepsPerDecade);
        const { Np0, Np } = calculateNpCurve(Re);

        if (Np0 > 0) unbaffledData.push({ x: Re, y: Np0 });
        if (Np > 0) baffledData.push({ x: Re, y: Np });
        if (NpMax > 0) maxData.push({ x: Re, y: NpMax });
    }

    // Replace Datasets
    const datasets = [
        {
            label: '完全邪魔板推算値 (NpMax)',
            data: maxData,
            showLine: true,
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
        },
        {
            label: '邪魔板なし推算曲線 (Np0)',
            data: unbaffledData,
            showLine: true,
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: false
        },
        {
            label: (config.baffleActive && config.coilActive) ? '邪魔板＋コイル 推算曲線 (Np)' :
                (config.coilActive) ? 'コイルあり 推算曲線 (Np)' :
                    (config.baffleActive) ? '邪魔板あり推算曲線 (Np)' : '邪魔板なし推算曲線 (Np)',
            data: baffledData,
            showLine: true,
            borderColor: '#06b6d4',
            borderWidth: 3,
            pointRadius: 0,
            fill: false
        }
    ];

    if (!isNewt) {
        datasets.push({
            label: '実測値 (ベース液粘度)',
            data: expDotsBase,
            showLine: false,
            backgroundColor: 'transparent',
            borderColor: '#10b981',
            borderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointStyle: 'circle'
        });
    }

    datasets.push({
        label: isNewt ? '実験データ (実測値)' : '実測値 (代表粘度・非ニュートン)',
        data: expDots,
        showLine: false,
        backgroundColor: '#10b981',
        borderColor: '#f3f4f6',
        borderWidth: 1.5,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointStyle: 'circle'
    });

    // 3. Generate Just-Suspended Speed (Njs) Plot Point (only if solid-liquid system is active)
    if (config.solidLiquidActive) {
        const njsRes = calculateNjs();
        if (!njsRes.error && njsRes.Njs_rpm > 0) {
            // Calculate Re at Njs
            const effRho = getEffectiveDensity();
            const Re_Njs = (effRho * njsRes.Njs_rps * Math.pow(config.d, 2)) / njsRes.mu;
            // Calculate Np at Re_Njs
            const { Np } = calculateNpCurve(Re_Njs);

            datasets.push({
                label: '完全浮遊限界速度 Njs',
                data: [{ x: Re_Njs, y: Np }],
                showLine: false,
                backgroundColor: '#ef4444', // Red dot
                borderColor: '#f3f4f6',
                borderWidth: 2,
                pointRadius: 9,
                pointHoverRadius: 11,
                pointStyle: 'rectRot' // diamond shape
            });
        }
    }

    chart.data.datasets = datasets;

    chart.update();
}

// ----------------------------------------------------
// Sample Data & CSV Handling
// ----------------------------------------------------

function loadSampleData() {
    // Parameters matches image 1 & 2
    config.g = 9.806;
    config.liquidTemp = 25;
    config.rho = 998;
    config.mu = 0.417; // matches experimental rows in image 1 (4.17E-01)
    config.DT = 0.105;
    config.H = 0.093;
    config.headType = 'semi-elliptical';
    config.impellerType = 'pitched-paddle';
    config.np = 4;
    config.theta = 45;
    config.d = 0.060;
    config.b = 0.020;
    config.clearance = 0.020;
    config.n_stage = 1;
    config.baffleActive = true;
    config.nB = 1;
    config.Bw = 0.014;

    // 伝熱シミュレーション用の代表初期値セット
    config.liquidTempInit = 20;
    config.liquidCp = 4184;
    config.liquidK = 0.60;
    config.wallThickness = 0.003;
    config.wallK = 16.3;
    config.jacketType = 'flat';
    config.jacketGap = 0.010;
    config.coilActive = true;
    config.coilOuterDia = 0.010;
    config.coilInnerDia = 0.008;
    config.coilPitch = 0.025;
    config.coilCenterDia = 0.075;
    config.mediaType = 'water';
    config.mediaTempIn = 80;
    config.mediaFlow = 0.05;
    config.mediaRho = 1000;
    config.mediaMu = 0.001;
    config.mediaCp = 4184;
    config.mediaK = 0.60;
    config.mediaViscCorr = 1.0;
    config.foulingFactor = 0.0001;

    initInputs();

    // Create Sample blocks based on image 1
    expBlocks = [];
    document.getElementById('blocks-container').innerHTML = '';

    // Block 300 rpm
    addBlock({ name: '300 rpm 条件', N_default: 300, T_default: 0.000, Tb_default: 0.001 });
    // Block 400 rpm
    addBlock({ name: '400 rpm 条件', N_default: 400, T_default: 0.000, Tb_default: 0.023 });
    // Block 500 rpm
    addBlock({ name: '500 rpm 条件', N_default: 500, T_default: 0.000, Tb_default: 0.035 });
    // Block 600 rpm
    addBlock({ name: '600 rpm 条件', N_default: 600, T_default: 0.050, Tb_default: 0.039 }); // Torq Ave: T=0.050, Tb=0.039

    // Overwrite the Average Torques to match Image 1's "Ave" values perfectly
    // For 300 rpm block
    const b300 = expBlocks[0];
    b300.rows[0].Tb = 0.003;
    b300.rows[1].Tb = 0.003;
    b300.rows[2].Tb = 0.001;
    b300.rows[3].Tb = 0.001;
    b300.rows[4].Tb = 0.001;
    b300.rows[5].Tb = 0.001;
    b300.rows[6].Tb = 0.001;
    // We adjust the first row for N to make Average rotation N=650 rpm as shown in image 1
    // Actually, Ave row in 300 rpm block had N=650 rpm, T=0.08, Tb=0.040714
    // We will set a custom Ave override or just update the rows:
    b300.rows.forEach(r => { r.N = 650; r.T = 0.08; }); // Torq Ave: T=0.08, Tb=0.040714
    b300.name = '650 rpm 代表条件';

    // For 400 rpm block
    const b400 = expBlocks[1];
    b400.rows[0].Tb = 0.025;
    b400.rows[1].Tb = 0.027;
    b400.rows[2].Tb = 0.024;
    b400.rows[3].Tb = 0.025;
    b400.rows[4].Tb = 0.021;
    b400.rows[5].Tb = 0.018;
    b400.rows[6].Tb = 0.023;
    b400.rows.forEach(r => { r.N = 400; r.T = 0.040; });

    // For 500 rpm block
    const b500 = expBlocks[2];
    b500.rows[0].Tb = 0.034;
    b500.rows[1].Tb = 0.035;
    b500.rows[2].Tb = 0.037;
    b500.rows[3].Tb = 0.035;
    b500.rows[4].Tb = 0.034;
    b500.rows[5].Tb = 0.036;
    b500.rows[6].Tb = 0.039;
    b500.rows.forEach(r => { r.N = 500; r.T = 0.050; });

    // For 600 rpm block
    const b600 = expBlocks[3];
    b600.rows[0].Tb = 0.041;
    b600.rows[1].Tb = 0.040;
    b600.rows[2].Tb = 0.041;
    b600.rows[3].Tb = 0.041;
    b600.rows[4].Tb = 0.041;
    b600.rows[5].Tb = 0.042;
    b600.rows[6].Tb = 0.039;
    b600.rows.forEach(r => { r.N = 600; r.T = 0.059; });

    // Re-render blocks
    document.getElementById('blocks-container').innerHTML = '';
    expBlocks.forEach(b => renderBlockHTML(b));

    recalculateAll();

    // サンプル用のレオロジーCSVデータを読み込む
    const sampleCSV = `Sample,Model,Rating,R2,RMSE_Pa,MAE_Pa,eta_0_Pas,tau_y_Pa,eta_p_Pas,K_Pasn,n_flow,lambda_s,m_cross,eta_inf_Pas
カオリンスラリー (40wt%),Bingham,Excellent,0.995,0.12,0.08,0,5.2,0.025,0,0,0,0,0
ヨーグルト (プレーン),Casson,Good,0.985,0.25,0.18,0,6.5,0.15,0,0,0,0,0
トマトペースト (30Brix),Herschel-Bulkley,Excellent,0.998,0.50,0.30,0,18.0,0,15.0,0.40,0,0,0
キサンタンガム水溶液 (0.5%),Power-law,Fair,0.950,1.50,1.20,0,0,0,2.1,0.25,0,0,0
グリセリン (20℃),Newtonian,Excellent,0.999,0.01,0.01,1.41,0,0,0,0,0,0,0
マヨネーズ,Herschel-Bulkley,Good,0.988,1.2,0.8,0,65.0,0,12.0,0.55,0,0,0
歯磨き粉,Bingham,Good,0.980,2.5,1.8,0,120.0,25.0,0,0,0,0,0`;

    processRheologyCSV(sampleCSV);

    showToast('サンプルデータを読み込みました。', 'success');
}

function exportCSV() {
    if (expBlocks.length === 0) {
        showToast('エクスポートするデータがありません。', 'error');
        return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM

    // 1. Export Config Settings
    csvContent += '--- CONFIGURATION ---\n';
    csvContent += 'Key,Value\n';
    Object.keys(config).forEach(key => {
        csvContent += `${key},${config[key]}\n`;
    });
    csvContent += '\n';

    // 1.5 Export Rheology Data
    csvContent += '--- RHEOLOGY DATA ---\n';
    csvContent += 'Key,Value\n';
    csvContent += `rheologyDataJson,"${JSON.stringify(rheologyData).replace(/"/g, '""')}"\n`;
    csvContent += '\n';

    // 2. Export Experimental Blocks
    csvContent += '--- EXPERIMENTAL DATA ---\n';
    csvContent += 'BlockName,Time(s),N(rpm),T_raw(N.m),Tb_blank(N.m),n(1/s),P(W),Pv(W/m3),Re(-),Np(-),Fr(-)\n';

    const { rho, mu, d, DT, g, H } = config;
    const V = calcLiquidVolumeForPv(); // use measured V_act if set, else dish-corrected estimate


    expBlocks.forEach(b => {
        b.rows.forEach(row => {
            const n = row.N / 60;
            const T_net = row.T - row.Tb;
            const P = 2 * Math.PI * n * T_net;
            const Pv = P / V;
            const Re = calculateReVal(n);
            const Fr = calculateFrVal(n);

            let Np = 0;
            if (n > 0 && Math.abs(T_net) > 0) {
                Np = P / (rho * Math.pow(n, 3) * Math.pow(d, 5));
            }

            csvContent += `"${b.name}",${row.time},${row.N},${row.T},${row.Tb},${n.toFixed(3)},${P.toFixed(3)},${Pv.toFixed(1)},${Math.round(Re)},${Np.toFixed(3)},${Fr.toFixed(3)}\n`;
        });
    });

    // 3. Export Calculated Intermediate Variables
    csvContent += '\n';
    csvContent += '--- CALCULATED INTERMEDIATE VARIABLES ---\n';
    csvContent += 'Variable,Definition,Value\n';

    const vars = getKameiHiraokaIntermediateVars();
    const csvVarsRows = [
        { name: 'beta', def: '2ln(D/d) / (D/d - d/D)', val: vars.beta },
        { name: 'eta', def: '翼付近の循環流量比に関するパラメータ', val: vars.eta },
        { name: 'gamma', def: '流動モデルにおけるせん断幅の係数', val: vars.gamma },
        { name: 'X', def: '動力相関変数', val: vars.X },
        { name: 'Ct', def: '乱流時の形状項係数', val: vars.Ct },
        { name: 'm', def: '遷移域補正指数', val: vars.m },
        { name: 'Cu', def: '層流渦抵抗係数', val: vars.Cu },
        { name: 'f_infty', def: '極限摩擦係数', val: vars.f_infty },
        { name: 'CL', def: '層流抵抗の形状係数', val: vars.CL },
        { name: 'ReG_ratio', def: '流動モデルにおけるレイノルズ数比', val: vars.ReG_ratio },
        { name: 'NpMax', def: '完全邪魔板条件での最大動力数(段数補正済)', val: vars.NpMax }
    ];

    csvVarsRows.forEach(r => {
        csvContent += `"${r.name}","${r.def}",${r.val.toFixed(5)}\n`;
    });

    // 4. 完全浮遊速度 (Zwietering式)
    csvContent += '\n';
    csvContent += '--- COMPLETE SUSPENSION SPEED (Zwietering) ---\n';
    if (config.solidLiquidActive) {
        const njsRes = calculateNjs();
        if (!njsRes.error) {
            const dp_m = (config.dp_um ?? 150) * 1e-6;
            const S_val = config.sFactorMode === 'auto' ? getZwieteringPresetS() : (config.sFactorCustom ?? 5.0);
            csvContent += 'Variable,Definition,Value,Unit\n';
            csvContent += `"dp","粒子径",${dp_m.toExponential(4)},"m"\n`;
            csvContent += `"rho_S","粒子密度",${config.rho_S},"kg/m3"\n`;
            csvContent += `"delta_rho","密度差 (rhoS - rhoL)",${njsRes.delta_rho.toFixed(1)},"kg/m3"\n`;
            csvContent += `"nu","動粘度",${njsRes.nu.toExponential(4)},"m2/s"\n`;
            csvContent += `"X","粒子質量分率",${njsRes.X.toFixed(4)},"wt%"\n`;
            csvContent += `"S","Zwietering形状因子",${S_val.toFixed(2)},"-"\n`;
            csvContent += `"Njs","完全浮遊限界回転数",${njsRes.Njs_rps.toFixed(4)},"1/s"\n`;
            csvContent += `"Njs_rpm","完全浮遊限界回転数",${njsRes.Njs_rpm.toFixed(1)},"rpm"\n`;
            // Np and P at Njs
            const effRho = getEffectiveDensity();
            const Re_Njs = (effRho * njsRes.Njs_rps * Math.pow(config.d, 2)) / njsRes.mu;
            const { Np: Np_njs } = calculateNpCurve(Re_Njs);
            const P_njs = Np_njs * effRho * Math.pow(njsRes.Njs_rps, 3) * Math.pow(config.d, 5);
            const V_njs = calcLiquidVolumeForPv();
            csvContent += `"Re_Njs","Njs時のレイノルズ数",${Re_Njs.toFixed(1)},"-"\n`;
            csvContent += `"Np_Njs","Njs時の動力数",${Np_njs.toFixed(4)},"-"\n`;
            csvContent += `"P_Njs","Njs時の攪拌所要動力",${P_njs.toFixed(4)},"W"\n`;
            csvContent += `"Pv_Njs","Njs時の単位体積動力",${(P_njs / V_njs).toFixed(2)},"W/m3"\n`;
        } else {
            csvContent += `# エラー: ${njsRes.error}\n`;
        }
    } else {
        csvContent += '# 固液分散が無効です\n';
    }

    // 5. Metzner-Otto (非ニュートン流体)
    csvContent += '\n';
    csvContent += '--- METZNER-OTTO (Non-Newtonian) ---\n';
    const isNonNewt = rheologyData.activeModel && rheologyData.activeModel !== 'newtonian';
    if (isNonNewt && Object.keys(rheologyData.samples).length > 0) {
        const modelsArr = rheologyData.samples[rheologyData.activeSample] || [];
        const mInfo = modelsArr.find(m => m.modelId === rheologyData.activeModel);
        csvContent += 'Variable,Definition,Value,Unit\n';
        csvContent += `"Sample","試料名","${rheologyData.activeSample}","-"\n`;
        csvContent += `"Model","レオロジーモデル","${mInfo ? mInfo.name : rheologyData.activeModel}","-"\n`;
        csvContent += `"ks","Metzner-Otto装置定数",${rheologyData.ks.toFixed(4)},"-"\n`;
        if (mInfo) {
            const p = mInfo.params;
            csvContent += `"R2","決定係数 R²",${mInfo.r2.toFixed(5)},"-"\n`;
            csvContent += `"RMSE","RMSE",${mInfo.rmse.toFixed(5)},"Pa"\n`;
            if (p.tau_y !== undefined) csvContent += `"tau_y","降伏応力",${p.tau_y.toFixed(5)},"Pa"\n`;
            if (p.eta_p !== undefined) csvContent += `"eta_p","塑性粘度 / Casson粘度",${p.eta_p.toFixed(5)},"Pa.s"\n`;
            if (p.K !== undefined) csvContent += `"K","粘性係数",${p.K.toFixed(5)},"Pa.s^n"\n`;
            if (p.n !== undefined) csvContent += `"n","流動指数",${p.n.toFixed(5)},"-"\n`;
            if (p.eta_0 !== undefined) csvContent += `"eta_0","ゼロせん断粘度",${p.eta_0.toFixed(5)},"Pa.s"\n`;
            if (p.eta_inf !== undefined) csvContent += `"eta_inf","無限せん断粘度",${p.eta_inf.toFixed(5)},"Pa.s"\n`;
            if (p.lambda !== undefined) csvContent += `"lambda","時定数 lambda",${p.lambda.toFixed(5)},"s"\n`;
        }
        // Per-block effective viscosity
        csvContent += `\n"Block","N_avg (rpm)","gamma_eff (1/s)","mu_eff (Pa.s)"\n`;
        expBlocks.forEach(b => {
            const n_rps = b.aveCalculated ? (b.aveCalculated.N / 60) : 0;
            const gamma_eff = rheologyData.ks * n_rps;
            const mu_eff = calcEffectiveViscosity(n_rps);
            csvContent += `"${b.name}",${(n_rps * 60).toFixed(1)},${gamma_eff.toFixed(3)},${mu_eff.toFixed(6)}\n`;
        });
    } else {
        csvContent += '# 非ニュートン流体モデルが選択されていません\n';
    }

    // 6. Heat Transfer (伝熱シミュレーション)
    csvContent += '\n';
    csvContent += '--- HEAT TRANSFER SIMULATION ---\n';
    const heatRes = calculateHeatTransfer();
    const totalArea = heatRes.Aj + (config.coilActive ? heatRes.Ac : 0);
    const effU = totalArea > 0 ? (heatRes.UA_total / totalArea) : 0;
    const effH1 = totalArea > 0 ? ((heatRes.h1_j * heatRes.Aj + (config.coilActive ? heatRes.h1_c * heatRes.Ac : 0)) / totalArea) : 0;
    const effH2 = totalArea > 0 ? ((heatRes.h2_j * heatRes.Aj + (config.coilActive ? heatRes.h2_c * heatRes.Ac : 0)) / totalArea) : 0;

    csvContent += 'Variable,Value,Unit\n';
    csvContent += `"h1_eff (有効 液側境膜伝熱係数)",${effH1.toFixed(4)},"W/(m2.K)"\n`;
    csvContent += `"h2_eff (有効 熱媒側境膜伝熱係数)",${effH2.toFixed(4)},"W/(m2.K)"\n`;
    csvContent += `"U_eff (有効 総括伝熱係数)",${effU.toFixed(4)},"W/(m2.K)"\n`;
    csvContent += `"A_total (総伝熱面積)",${totalArea.toFixed(5)},"m2"\n`;

    // 1時間後の温度推算
    const V_act_heat = getLiquidVolume();
    const M_L = heatRes.rho_L * V_act_heat;
    let tempAt1hr = config.liquidTempInit ?? 20.0;
    if (effU > 0) {
        if (!heatRes.isSteam) {
            const expTerm = Math.exp(-heatRes.UA_total / Math.max(1e-3, heatRes.W_j * heatRes.Cp_j));
            const tau = (M_L * heatRes.Cp_L) / (heatRes.W_j * heatRes.Cp_j * (1 - expTerm));
            tempAt1hr = heatRes.T_in - (heatRes.T_in - tempAt1hr) * Math.exp(-3600 / Math.max(1e-3, tau));
        } else {
            const tau = (M_L * heatRes.Cp_L) / heatRes.UA_total;
            tempAt1hr = heatRes.T_in - (heatRes.T_in - tempAt1hr) * Math.exp(-3600 / Math.max(1e-3, tau));
        }
    }
    csvContent += `"T_1hr (1時間後の到達温度)",${tempAt1hr.toFixed(2)},"°C"\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'agitator_exp_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('CSVエクスポートが完了しました。', 'success');
}

function importCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
        const text = evt.target.result;
        const lines = text.split('\n');

        let inConfig = false;
        let inData = false;
        let inRheology = false;

        let importedConfig = {};
        let importedBlocksMap = {};
        let importedRheology = null;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.startsWith('--- CONFIGURATION ---')) {
                inConfig = true; inData = false; inRheology = false; return;
            }
            if (trimmed.startsWith('--- RHEOLOGY DATA ---')) {
                inConfig = false; inData = false; inRheology = true; return;
            }
            if (trimmed.startsWith('--- EXPERIMENTAL DATA ---')) {
                inConfig = false; inData = true; inRheology = false; return;
            }
            if (trimmed.startsWith('---')) {
                inConfig = false; inData = false; inRheology = false; return;
            }

            if (inConfig || inRheology) {
                const firstComma = trimmed.indexOf(',');
                if (firstComma > 0) {
                    const key = trimmed.substring(0, firstComma).trim();
                    let val = trimmed.substring(firstComma + 1).trim();

                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.substring(1, val.length - 1).replace(/""/g, '"');
                    } else {
                        if (val === 'true') val = true;
                        else if (val === 'false') val = false;
                        else if (!isNaN(val) && val !== '') val = parseFloat(val);
                    }

                    if (inConfig) {
                        importedConfig[key] = val;
                    } else if (inRheology && key === 'rheologyDataJson') {
                        try {
                            importedRheology = JSON.parse(val);
                        } catch (e) { console.warn("Failed to parse rheology JSON", e); }
                    }
                }
            } else if (inData) {
                const parts = trimmed.split(',');
                if (parts.length >= 5) {
                    const blockName = parts[0].replace(/^"|"$/g, '').trim();
                    if (blockName === 'BlockName') return; // Header skip

                    const time = parseFloat(parts[1]) || 0;
                    const N = parseFloat(parts[2]) || 0;
                    const T = parseFloat(parts[3]) || 0;
                    const Tb = parseFloat(parts[4]) || 0;

                    if (!importedBlocksMap[blockName]) {
                        importedBlocksMap[blockName] = [];
                    }
                    importedBlocksMap[blockName].push({ time, N, T, Tb });
                }
            }
        });

        // Apply config
        if (Object.keys(importedConfig).length > 0) {
            config = { ...config, ...importedConfig };
            initInputs();
        }

        // Apply rheology
        if (importedRheology) {
            rheologyData = importedRheology;
            updateRheologyUI();
        }

        // Apply blocks
        if (Object.keys(importedBlocksMap).length > 0) {
            expBlocks = [];
            document.getElementById('blocks-container').innerHTML = '';

            Object.keys(importedBlocksMap).forEach(name => {
                const blockId = 'block-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                const block = {
                    id: blockId,
                    name: name,
                    rows: importedBlocksMap[name]
                };
                expBlocks.push(block);
                renderBlockHTML(block);
            });
        }

        recalculateAll();
        showToast('CSVインポートが完了しました。', 'success');
    };
    reader.readAsText(file);
}

// Helper to draw a double-headed arrow on Canvas 2D
function drawCanvasArrow(ctx, x1, y1, x2, y2, color = '#0891b2', arrowSize = 6, doubleHeaded = true) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;

    // Line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrow heads
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Head at (x2, y2)
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (doubleHeaded) {
        // Head at (x1, y1)
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + arrowSize * Math.cos(angle - Math.PI / 6), y1 + arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x1 + arrowSize * Math.cos(angle + Math.PI / 6), y1 + arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

// Draw dynamic vessel schematic to offscreen canvas and output as PNG image to PDF template
function drawVesselForPDF() {
    const canvas = document.getElementById('pdfVesselCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 500, 600);

    const cx = 250;
    const w_vessel_px = 300;
    const scale = w_vessel_px / config.DT;

    const r_vessel = w_vessel_px / 2; // 150
    const lx = cx - r_vessel; // 100
    const rx = cx + r_vessel; // 400

    const y_top = 130;
    let hb_px = 0;
    if (config.headType === 'semi-elliptical') {
        hb_px = r_vessel / 2; // 75
    } else if (config.headType === 'dish') {
        hb_px = r_vessel * 0.388; // ~58
    } else if (config.headType === 'hemispherical') {
        hb_px = r_vessel; // 150
    } else {
        hb_px = 0;
    }

    const H_px = Math.max(0, config.H * scale);
    const y_cyl_bottom = y_top + Math.max(0, H_px - hb_px);
    const y_deepest = y_cyl_bottom + hb_px;

    // 1. Draw Liquid Volume (Back Layer)
    const h_liquid_px = getLiquidHeight() * scale;
    const y_liquid = y_deepest - h_liquid_px;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.beginPath();
    ctx.moveTo(lx, y_liquid);
    ctx.lineTo(lx, y_cyl_bottom);
    if (config.headType === 'semi-elliptical') {
        ctx.ellipse(cx, y_cyl_bottom, r_vessel, hb_px, 0, Math.PI, 0, true);
    } else if (config.headType === 'dish') {
        const cr = 30;
        ctx.arc(lx + cr, y_cyl_bottom, cr, Math.PI, Math.PI / 2, true);
        ctx.ellipse(cx, y_cyl_bottom, r_vessel, hb_px * 1.2, 0, Math.PI / 2, Math.PI / 2, true); // approximate
        ctx.arc(rx - cr, y_cyl_bottom, cr, Math.PI / 2, 0, true);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl_bottom, r_vessel, Math.PI, 0, true);
    } else {
        ctx.lineTo(rx, y_cyl_bottom);
    }
    ctx.lineTo(rx, y_liquid);
    ctx.closePath();
    ctx.fill();

    // Liquid surface line
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx, y_liquid);
    ctx.lineTo(rx, y_liquid);
    ctx.stroke();
    ctx.restore();

    // 2. Draw Vessel Outline
    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lx, y_top);
    ctx.lineTo(lx, y_cyl_bottom);
    if (config.headType === 'semi-elliptical') {
        ctx.ellipse(cx, y_cyl_bottom, r_vessel, hb_px, 0, Math.PI, 0, true);
    } else if (config.headType === 'dish') {
        // Approximate dish bottom corners
        const cr = 30;
        ctx.arc(lx + cr, y_cyl_bottom, cr, Math.PI, Math.PI / 2, true);
        ctx.ellipse(cx, y_cyl_bottom, r_vessel, hb_px * 1.2, 0, Math.PI / 2, Math.PI / 2, true);
        ctx.arc(rx - cr, y_cyl_bottom, cr, Math.PI / 2, 0, true);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl_bottom, r_vessel, Math.PI, 0, true);
    } else {
        ctx.lineTo(rx, y_cyl_bottom);
    }
    ctx.lineTo(rx, y_top);
    ctx.stroke();

    // Top Lip / Flange
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, y_top - 30);
    ctx.lineTo(420, y_top - 30);
    ctx.stroke();

    // Nozzle
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(230, y_top - 50, 40, 20);
    ctx.beginPath();
    ctx.moveTo(220, y_top - 50);
    ctx.lineTo(280, y_top - 50);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // 3. Draw Baffles
    const bw_px = config.Bw * scale;
    if (config.baffleActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;

        // Set baffle height to 95% of the straight cylinder section, independent of liquid height
        const baffle_h = (y_cyl_bottom - y_top) * 0.95;
        const baffle_y_start = y_cyl_bottom - baffle_h;

        // Left
        ctx.fillRect(lx, baffle_y_start, bw_px, y_cyl_bottom - baffle_y_start);
        ctx.strokeRect(lx, baffle_y_start, bw_px, y_cyl_bottom - baffle_y_start);

        // Right
        if (parseInt(config.nB) > 1) {
            ctx.fillRect(rx - bw_px, baffle_y_start, bw_px, y_cyl_bottom - baffle_y_start);
            ctx.strokeRect(rx - bw_px, baffle_y_start, bw_px, y_cyl_bottom - baffle_y_start);
        }
        ctx.restore();
    }

    // 4. Draw Impeller Shaft
    const d_px = config.d * scale;
    const b_px = config.b * scale;
    const clearance_px = config.clearance * scale;
    const y_bottom_impeller = y_deepest - clearance_px - b_px / 2;

    ctx.save();
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, y_top - 30);
    ctx.lineTo(cx, y_bottom_impeller);
    ctx.stroke();
    ctx.restore();

    // 5. Draw Impellers (Stages)
    // RULE: The physical impeller geometry is based on the design stage count.
    //       Only the liquid level changes with V_act; the shaft and stage spacing remain fixed.
    const n_stages = parseInt(config.n_stage) || 1;
    const stage_gap = b_px * 1.3;
    let stages_y = [];
    for (let i = 0; i < n_stages; i++) {
        stages_y.push(y_bottom_impeller - (i * stage_gap));
    }

    stages_y.forEach(y_imp => {
        ctx.save();
        // Hub
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(cx - 5, y_imp - b_px / 2, 10, b_px);

        const blade_w = (d_px - 10) / 2;
        ctx.fillStyle = '#ec4899';
        ctx.strokeStyle = '#db2777';
        ctx.lineWidth = 1.5;

        if (config.impellerType === 'pitched-paddle') {
            // Left angled blade
            ctx.beginPath();
            ctx.moveTo(cx - 5, y_imp - b_px / 3);
            ctx.lineTo(cx - 5 - blade_w, y_imp - b_px / 2);
            ctx.lineTo(cx - 5 - blade_w, y_imp + b_px / 6);
            ctx.lineTo(cx - 5, y_imp + b_px / 3);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            // Right angled blade
            ctx.beginPath();
            ctx.moveTo(cx + 5, y_imp - b_px / 3);
            ctx.lineTo(cx + 5 + blade_w, y_imp - b_px / 6);
            ctx.lineTo(cx + 5 + blade_w, y_imp + b_px / 2);
            ctx.lineTo(cx + 5, y_imp + b_px / 3);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

        } else if (config.impellerType === 'propeller') {
            // Left curve
            ctx.beginPath();
            ctx.moveTo(cx - 5, y_imp);
            ctx.bezierCurveTo(cx - 5 - blade_w / 2, y_imp - b_px / 2, cx - 5 - blade_w, y_imp - b_px / 4, cx - 5 - blade_w, y_imp);
            ctx.bezierCurveTo(cx - 5 - blade_w, y_imp + b_px / 2, cx - 5 - blade_w / 2, y_imp, cx - 5, y_imp);
            ctx.fill(); ctx.stroke();

            // Right curve
            ctx.beginPath();
            ctx.moveTo(cx + 5, y_imp);
            ctx.bezierCurveTo(cx + 5 + blade_w / 2, y_imp - b_px / 2, cx + 5 + blade_w, y_imp - b_px / 4, cx + 5 + blade_w, y_imp);
            ctx.bezierCurveTo(cx + 5 + blade_w, y_imp + b_px / 2, cx + 5 + blade_w / 2, y_imp, cx + 5, y_imp);
            ctx.fill(); ctx.stroke();

        } else if (config.impellerType === 'faudler') {
            // Left curve
            ctx.beginPath();
            ctx.moveTo(cx - 5, y_imp - b_px / 4);
            ctx.quadraticCurveTo(cx - 5 - blade_w / 2, y_imp - b_px / 2, cx - 5 - blade_w, y_imp);
            ctx.lineTo(cx - 5 - blade_w, y_imp + b_px / 2);
            ctx.quadraticCurveTo(cx - 5 - blade_w / 2, y_imp + b_px / 4, cx - 5, y_imp + b_px / 4);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            // Right curve
            ctx.beginPath();
            ctx.moveTo(cx + 5, y_imp - b_px / 4);
            ctx.quadraticCurveTo(cx + 5 + blade_w / 2, y_imp - b_px / 2, cx + 5 + blade_w, y_imp);
            ctx.lineTo(cx + 5 + blade_w, y_imp + b_px / 2);
            ctx.quadraticCurveTo(cx + 5 + blade_w / 2, y_imp + b_px / 4, cx + 5, y_imp + b_px / 4);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

        } else {
            // Flat paddle / turbine (rectangles)
            ctx.fillRect(cx - 5 - blade_w, y_imp - b_px / 2, blade_w, b_px);
            ctx.strokeRect(cx - 5 - blade_w, y_imp - b_px / 2, blade_w, b_px);

            ctx.fillRect(cx + 5, y_imp - b_px / 2, blade_w, b_px);
            ctx.strokeRect(cx + 5, y_imp - b_px / 2, blade_w, b_px);
        }

        if (config.impellerType === 'flat-turbine') {
            ctx.fillStyle = '#9ca3af';
            ctx.strokeStyle = '#4b5563';
            ctx.lineWidth = 1;
            ctx.fillRect(cx - d_px * 0.37, y_imp - 2, d_px * 0.74, 4);
            ctx.strokeRect(cx - d_px * 0.37, y_imp - 2, d_px * 0.74, 4);
        }
        ctx.restore();
    });

    // 6. Draw Dimension Guides, Arrows and Labels
    ctx.save();
    ctx.strokeStyle = '#0891b2';
    ctx.fillStyle = '#0891b2';
    ctx.font = "bold 13px 'Outfit', 'Inter', sans-serif";

    // Guide lines styling
    const setGuideStyle = () => {
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 3]);
    };

    // DT (Vessel Diameter)
    setGuideStyle();
    ctx.beginPath();
    ctx.moveTo(lx, y_cyl_bottom);
    ctx.lineTo(lx, y_deepest + 55);
    ctx.moveTo(rx, y_cyl_bottom);
    ctx.lineTo(rx, y_deepest + 55);
    ctx.stroke();

    ctx.setLineDash([]); // solid
    drawCanvasArrow(ctx, lx, y_deepest + 45, rx, y_deepest + 45);
    ctx.textAlign = 'center';
    ctx.fillText(`DT = ${config.DT.toFixed(3)} m`, cx, y_deepest + 38);

    // H (Liquid height)
    setGuideStyle();
    ctx.beginPath();
    ctx.moveTo(rx, y_liquid);
    ctx.lineTo(460, y_liquid);
    ctx.moveTo(cx, y_deepest);
    ctx.lineTo(460, y_deepest);
    ctx.stroke();

    ctx.setLineDash([]);
    drawCanvasArrow(ctx, 450, y_liquid, 450, y_deepest);

    // Vertical text rotation
    ctx.save();
    ctx.translate(458, (y_liquid + y_deepest) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(`H = ${getLiquidHeight().toFixed(3)} m`, 0, 0);
    ctx.restore();

    // d (Impeller Diameter)
    const y_d_line = y_bottom_impeller - b_px - 20;
    setGuideStyle();
    ctx.beginPath();
    ctx.moveTo(cx - d_px / 2, y_bottom_impeller);
    ctx.lineTo(cx - d_px / 2, y_d_line - 10);
    ctx.moveTo(cx + d_px / 2, y_bottom_impeller);
    ctx.lineTo(cx + d_px / 2, y_d_line - 10);
    ctx.stroke();

    ctx.setLineDash([]);
    drawCanvasArrow(ctx, cx - d_px / 2, y_d_line, cx + d_px / 2, y_d_line);
    ctx.textAlign = 'center';
    ctx.fillText(`d = ${config.d.toFixed(3)} m`, cx, y_d_line - 6);

    // C (Clearance)
    ctx.setLineDash([]);
    const y_c_start_pdf = y_bottom_impeller + b_px / 2;
    drawCanvasArrow(ctx, cx + 25, y_c_start_pdf, cx + 25, y_deepest);
    ctx.textAlign = 'left';
    ctx.fillText(`C = ${config.clearance.toFixed(3)} m`, cx + 35, (y_c_start_pdf + y_deepest) / 2 + 4);

    // b (Blade width)
    const x_b_line = cx + d_px / 2 + 25;
    drawCanvasArrow(ctx, x_b_line, y_bottom_impeller - b_px / 2, x_b_line, y_bottom_impeller + b_px / 2);
    ctx.textAlign = 'left';
    ctx.fillText(`b = ${config.b.toFixed(3)} m`, x_b_line + 10, y_bottom_impeller + 4);

    // Bw (Baffle Width)
    if (config.baffleActive) {
        drawCanvasArrow(ctx, lx, y_top - 15, lx + bw_px, y_top - 15);
        ctx.textAlign = 'center';
        ctx.fillText(`Bw=${config.Bw.toFixed(3)}m`, lx + bw_px / 2, y_top - 23);
    }
    ctx.restore();

    // Output directly to PNG Image source in template
    const imgEl = document.getElementById('pdf-vessel-img');
    if (imgEl) {
        imgEl.src = canvas.toDataURL('image/png');
    }
}

// Generate PDF Report using html2pdf.js
function generatePDFReport() {
    if (!chart) {
        showToast('グラフが初期化されていません。', 'error');
        return;
    }

    // Draw the latest vessel dimensions Canvas for PDF (direct PNG export)
    drawVesselForPDF();
    document.getElementById('pdf-exp-number').textContent = config.expNumber || '-';
    document.getElementById('pdf-exp-date').textContent = config.expDate || '-';
    document.getElementById('pdf-exp-author').textContent = config.expAuthor || '-';

    // 2. Fill Conditions
    document.getElementById('pdf-val-g').textContent = config.g.toFixed(3);
    document.getElementById('pdf-val-temp').textContent = config.liquidTemp.toFixed(1);
    document.getElementById('pdf-val-rho').textContent = config.rho.toFixed(1);
    document.getElementById('pdf-val-mu').textContent = config.mu.toFixed(4);

    document.getElementById('pdf-val-dt').textContent = config.DT.toFixed(3);
    document.getElementById('pdf-val-h').textContent = getLiquidHeight().toFixed(3);

    // Map bottom head type
    const headMap = {
        'flat': '平底',
        'semi-elliptical': '半楕円形',
        'dish': '皿型',
        'hemispherical': '全半球形'
    };
    document.getElementById('pdf-val-head').textContent = headMap[config.headType] || config.headType;

    // Map impeller type
    const impellerMap = {
        'pitched-paddle': '傾斜パドル',
        'flat-paddle': '平板パドル',
        'flat-turbine': '平板タービン',
        'propeller': 'プロペラ',
        'faudler': 'ファウドラー'
    };
    document.getElementById('pdf-val-impeller').textContent = impellerMap[config.impellerType] || config.impellerType;
    document.getElementById('pdf-val-np').textContent = config.np;
    document.getElementById('pdf-val-theta').textContent = config.theta;
    document.getElementById('pdf-val-d').textContent = config.d.toFixed(3);
    document.getElementById('pdf-val-b').textContent = config.b.toFixed(3);
    document.getElementById('pdf-val-stages').textContent = getActiveStages();

    document.getElementById('pdf-val-baffle').textContent = config.baffleActive ? 'あり' : 'なし';
    document.getElementById('pdf-val-nb').textContent = config.nB;
    document.getElementById('pdf-val-bw').textContent = config.Bw.toFixed(3);

    // Heat transfer data mapping for PDF
    const heatRes = calculateHeatTransfer();
    const totalArea = heatRes.Aj + (config.coilActive ? heatRes.Ac : 0);
    const effU = totalArea > 0 ? (heatRes.UA_total / totalArea) : 0;
    const effH1 = totalArea > 0 ? ((heatRes.h1_j * heatRes.Aj + (config.coilActive ? heatRes.h1_c * heatRes.Ac : 0)) / totalArea) : 0;
    const effH2 = totalArea > 0 ? ((heatRes.h2_j * heatRes.Aj + (config.coilActive ? heatRes.h2_c * heatRes.Ac : 0)) / totalArea) : 0;

    document.getElementById('pdf-val-liquid-cp').textContent = config.liquidCp;
    document.getElementById('pdf-val-liquid-k').textContent = config.liquidK.toFixed(2);
    document.getElementById('pdf-val-wall-thickness').textContent = config.wallThickness.toFixed(3);
    document.getElementById('pdf-val-wall-k').textContent = config.wallK.toFixed(1);
    document.getElementById('pdf-val-jacket-type').textContent = config.jacketType === 'spiral'
        ? '渦巻ジャケット（接線流）'
        : (config.jacketType === 'flat-tangential' ? '平板ジャケット（接線流）' : '平板ジャケット（半径流）');
    document.getElementById('pdf-val-coil-active').textContent = config.coilActive ? 'あり' : 'なし';
    document.getElementById('pdf-val-media-type').textContent = config.mediaType === 'steam' ? 'スチーム' : '水';
    document.getElementById('pdf-val-media-temp-in').textContent = config.mediaTempIn.toFixed(1);
    document.getElementById('pdf-val-media-flow').textContent = config.mediaFlow.toFixed(3);
    document.getElementById('pdf-val-heat-h1').textContent = effH1.toFixed(1);
    document.getElementById('pdf-val-heat-h2').textContent = effH2.toFixed(1);
    document.getElementById('pdf-val-heat-u').textContent = effU.toFixed(1);
    document.getElementById('pdf-val-heat-area').textContent = totalArea.toFixed(4);

    // Solid-Liquid data mapping for PDF
    const slSection = document.getElementById('pdf-solid-liquid-section');
    if (config.solidLiquidActive) {
        slSection.style.display = 'block';
        document.getElementById('pdf-val-dp').textContent = config.dp_um;
        document.getElementById('pdf-val-rhos').textContent = config.rho_S;

        let S = 5.0;
        if (config.sFactorMode === 'auto') {
            S = getZwieteringPresetS();
        } else {
            S = config.sFactorCustom ?? 5.0;
        }
        document.getElementById('pdf-val-sfactor').textContent = S.toFixed(2);

        // Calculate Njs values directly for full detail
        const njsRes = calculateNjs();
        if (!njsRes.error) {
            document.getElementById('pdf-val-deltarho').textContent = Math.round(njsRes.delta_rho) + ' kg/m³';
            document.getElementById('pdf-val-nu').textContent = njsRes.nu.toExponential(3) + ' m²/s';
            document.getElementById('pdf-val-xwt').textContent = njsRes.X.toFixed(3);
            document.getElementById('pdf-val-njs').textContent = Math.round(njsRes.Njs_rpm);
            // Re, Np, P, Pv at Njs
            const effRho = getEffectiveDensity();
            const Re_njs = (effRho * njsRes.Njs_rps * Math.pow(config.d, 2)) / njsRes.mu;
            const { Np: Np_njs_pdf } = calculateNpCurve(Re_njs);
            const P_njs_pdf = Np_njs_pdf * effRho * Math.pow(njsRes.Njs_rps, 3) * Math.pow(config.d, 5);
            const Pv_njs_pdf = P_njs_pdf / calcLiquidVolumeForPv();
            document.getElementById('pdf-val-re-njs').textContent = Math.round(Re_njs).toLocaleString();
            document.getElementById('pdf-val-np-njs').textContent = Np_njs_pdf.toFixed(3);
            document.getElementById('pdf-val-pnjs').textContent = P_njs_pdf.toFixed(3);
            document.getElementById('pdf-val-pvnjs').textContent = Pv_njs_pdf.toFixed(1);
        } else {
            document.getElementById('pdf-val-xwt').textContent = document.getElementById('sim-res-X').textContent.replace(' wt%', '');
            document.getElementById('pdf-val-njs').textContent = '--';
            document.getElementById('pdf-val-pnjs').textContent = '--';
        }
    } else {
        slSection.style.display = 'none';
    }

    // 3. Render Light Mode Chart on Hidden Canvas
    const pdfCanvas = document.getElementById('pdfChartCanvas');
    const pdfCtx = pdfCanvas.getContext('2d');

    // Custom plugins for Light Mode PDF Chart
    const lightChartAreaBorder = {
        id: 'lightChartAreaBorder',
        afterDraw(c) {
            const { ctx: cCtx, chartArea: { top, right, bottom, left, width, height } } = c;
            cCtx.save();
            cCtx.strokeStyle = '#4b5563'; // Darker gray frame for clear boundary
            cCtx.lineWidth = 1.5;
            cCtx.strokeRect(left, top, width, height);
            cCtx.restore();
        }
    };

    const customCanvasBackgroundColor = {
        id: 'customCanvasBackgroundColor',
        beforeDraw(c) {
            const { ctx: cCtx } = c;
            cCtx.save();
            cCtx.globalCompositeOperation = 'destination-over';
            cCtx.fillStyle = '#ffffff'; // Force solid white background
            cCtx.fillRect(0, 0, c.width, c.height);
            cCtx.restore();
        }
    };

    // Deep copy datasets from current chart and adjust for print colors (light mode)
    const originalDatasets = chart.data.datasets;
    const lightDatasets = originalDatasets.map(ds => {
        const copy = JSON.parse(JSON.stringify(ds));
        if (copy.label.includes('NpMax')) {
            copy.borderColor = '#dc2626'; // High-contrast Red
        } else if (copy.label.includes('Np0')) {
            copy.borderColor = '#d97706'; // High-contrast Amber/Orange
        } else if (copy.label.includes('Np')) {
            copy.borderColor = '#0284c7'; // High-contrast Blue
        } else if (copy.label.includes('実験データ') || copy.label.includes('実測値')) {
            copy.backgroundColor = '#059669'; // High-contrast Emerald
            copy.borderColor = '#111827'; // Solid Dark boundary for dots
        } else if (copy.label.includes('Njs')) {
            copy.backgroundColor = '#dc2626'; // High-contrast Red dot
            copy.borderColor = '#111827';
        }
        return copy;
    });

    const pdfChart = new Chart(pdfCtx, {
        type: 'scatter',
        data: {
            datasets: lightDatasets
        },
        plugins: [lightChartAreaBorder, customCanvasBackgroundColor, lightChartRegions, lightChartNjsLabel, lightChartSimSpeedLine],
        options: {
            responsive: false,
            devicePixelRatio: 2, // High resolution export
            animation: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#111827', // Black legend text
                        font: { family: 'Inter', size: 10 }
                    }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'レイノルズ数 Re [-]',
                        color: '#111827',
                        font: { family: 'Outfit', size: 12, weight: 600 }
                    },
                    border: { display: true, color: '#4b5563', width: 1.5 },
                    grid: {
                        color: function (context) {
                            if (!context.tick) return 'rgba(0, 0, 0, 0.02)';
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 'rgba(0, 0, 0, 0.15)'; // Major gridline
                            }
                            return 'rgba(0, 0, 0, 0.05)'; // Minor gridline
                        },
                        lineWidth: function (context) {
                            if (!context.tick) return 1;
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) return 1.0;
                            return 0.6;
                        },
                        tickColor: function (context) {
                            if (!context.tick) return 'rgba(0, 0, 0, 0.05)';
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) return 'rgba(0, 0, 0, 0.3)';
                            return 'rgba(0, 0, 0, 0.1)';
                        },
                        tickLength: function (context) {
                            if (!context.tick) return 6;
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) return 8;
                            return 4;
                        }
                    },
                    ticks: {
                        color: '#374151',
                        callback: function (value) {
                            const log10 = Math.log10(value);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return '10' + getSuperScript(Math.round(log10));
                            }
                            return '';
                        }
                    },
                    afterBuildTicks: function (scale) {
                        const ticks = [];
                        const minVal = (scale.min !== undefined && scale.min !== null && !isNaN(scale.min)) ? scale.min : ((scale.dataMin !== undefined && scale.dataMin !== null) ? scale.dataMin : 0.1);
                        const maxVal = (scale.max !== undefined && scale.max !== null && !isNaN(scale.max)) ? scale.max : ((scale.dataMax !== undefined && scale.dataMax !== null) ? scale.dataMax : 100000);
                        const minLog = Math.floor(Math.log10(minVal));
                        const maxLog = Math.ceil(Math.log10(maxVal));
                        for (let log = minLog; log <= maxLog; log++) {
                            const base = Math.pow(10, log);
                            for (let i = 1; i <= 9; i++) {
                                const val = base * i;
                                if (val >= minVal && val <= maxVal) {
                                    ticks.push({ value: val, major: (i === 1) });
                                }
                            }
                        }
                        scale.ticks = ticks;
                    },
                    min: chart.options.scales.x.min,
                    max: chart.options.scales.x.max
                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: '動力数 Np [-]',
                        color: '#111827',
                        font: { family: 'Outfit', size: 12, weight: 600 }
                    },
                    border: { display: true, color: '#4b5563', width: 1.5 },
                    grid: {
                        color: function (context) {
                            if (!context.tick) return 'rgba(0, 0, 0, 0.02)';
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return 'rgba(0, 0, 0, 0.15)'; // Major gridline
                            }
                            return 'rgba(0, 0, 0, 0.05)'; // Minor gridline
                        },
                        lineWidth: function (context) {
                            if (!context.tick) return 1;
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) return 1.0;
                            return 0.6;
                        },
                        tickColor: function (context) {
                            if (!context.tick) return 'rgba(0, 0, 0, 0.05)';
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) return 'rgba(0, 0, 0, 0.3)';
                            return 'rgba(0, 0, 0, 0.1)';
                        },
                        tickLength: function (context) {
                            if (!context.tick) return 6;
                            const val = context.tick.value;
                            const log10 = Math.log10(val);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) return 8;
                            return 4;
                        }
                    },
                    ticks: {
                        color: '#374151',
                        callback: function (value) {
                            const log10 = Math.log10(value);
                            if (Math.abs(log10 - Math.round(log10)) < 1e-10) {
                                return '10' + getSuperScript(Math.round(log10));
                            }
                            return '';
                        }
                    },
                    afterBuildTicks: function (scale) {
                        const ticks = [];
                        const minVal = (scale.min !== undefined && scale.min !== null && !isNaN(scale.min)) ? scale.min : ((scale.dataMin !== undefined && scale.dataMin !== null) ? scale.dataMin : 0.01);
                        const maxVal = (scale.max !== undefined && scale.max !== null && !isNaN(scale.max)) ? scale.max : ((scale.dataMax !== undefined && scale.dataMax !== null) ? scale.dataMax : 100);
                        const minLog = Math.floor(Math.log10(minVal));
                        const maxLog = Math.ceil(Math.log10(maxVal));
                        for (let log = minLog; log <= maxLog; log++) {
                            const base = Math.pow(10, log);
                            for (let i = 1; i <= 9; i++) {
                                const val = base * i;
                                if (val >= minVal && val <= maxVal) {
                                    ticks.push({ value: val, major: (i === 1) });
                                }
                            }
                        }
                        scale.ticks = ticks;
                    },
                    min: chart.options.scales.y.min,
                    max: chart.options.scales.y.max
                }
            }
        }
    });

    const chartImgUrl = pdfChart.toBase64Image();
    document.getElementById('pdf-chart-img').src = chartImgUrl;

    // Clean up temporary chart instance
    pdfChart.destroy();

    // 3.5 Fill PDF Calculated Intermediate Variables
    const pdfVarsBody = document.getElementById('pdf-calculated-vars-body');
    pdfVarsBody.innerHTML = '';

    const vars = getKameiHiraokaIntermediateVars();
    const pdfVarsRows = [
        { name: 'β (ベータ)', def: '2ln(D/d) / (D/d - d/D)', val: vars.beta },
        { name: 'η (イータ)', def: '翼付近の循環流量比に関するパラメータ', val: vars.eta },
        { name: 'γ (ガンマ)', def: '流動モデルにおけるせん断幅の係数', val: vars.gamma },
        { name: 'X', def: '動力相関変数', val: vars.X },
        { name: 'Ct', def: '乱流時の形状項係数', val: vars.Ct },
        { name: 'm', def: '遷移域補正指数', val: vars.m },
        { name: 'Cu', def: '層流渦抵抗係数', val: vars.Cu },
        { name: 'f_∞', def: '極限摩擦係数', val: vars.f_infty },
        { name: 'CL', def: '層流抵抗の形状係数', val: vars.CL },
        { name: 'ReG / Re', def: '流動モデルにおけるレイノルズ数比', val: vars.ReG_ratio },
        { name: 'NpMax (段数補正済)', def: '完全邪魔板条件での最大動力数', val: vars.NpMax }
    ];

    pdfVarsRows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: 500;">${r.name}</td>
            <td style="padding: 5px; border: 1px solid #e5e7eb; color: #4b5563; font-size: 8px;">${r.def}</td>
            <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: 600; color: #0284c7;">${r.val.toFixed(5)}</td>
        `;
        pdfVarsBody.appendChild(tr);
    });

    // Liquid volume row in PDF
    const V_liq = calcLiquidVolumeForPv();
    const V_liq_mL = V_liq * 1e6;
    const labelText = (config.V_act && config.V_act > 0) ? '実測値 (V_act)' : '概算値';
    const headLabelMap = { 'flat': '平底', 'semi-elliptical': '半楕円形(2:1)', 'dish': '皿型', 'hemispherical': '全半球形' };
    const headLabelPdf = headLabelMap[config.headType] || config.headType;
    const trVpdf = document.createElement('tr');
    trVpdf.innerHTML = `
        <td style="padding: 5px; border: 1px solid #e5e7eb; font-weight: 500;">V<sub>液</sub> (${labelText})</td>
        <td style="padding: 5px; border: 1px solid #e5e7eb; color: #4b5563; font-size: 8px;">液体積の${labelText === '実測値 (V_act)' ? '実測値' : '概算値'}（鏡板：${headLabelPdf}）</td>
        <td style="padding: 5px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: 600; color: #0284c7;">${V_liq.toExponential(4)} m³ &nbsp;(${V_liq_mL.toFixed(1)} mL)</td>
    `;
    pdfVarsBody.appendChild(trVpdf);

    // 3.5 Non-Newtonian Information
    const pdfNonNewtSection = document.getElementById('pdf-non-newtonian-section');
    const pdfNonNewtContent = document.getElementById('pdf-non-newtonian-content');

    if (rheologyData.activeModel && rheologyData.activeModel !== 'newtonian') {
        const models = rheologyData.samples[rheologyData.activeSample] || [];
        const modelInfo = models.find(m => m.modelId === rheologyData.activeModel);

        if (modelInfo) {
            let formulaStr = '';
            let paramStr = '';
            const p = modelInfo.params;

            if (rheologyData.activeModel === 'bingham') {
                formulaStr = `τ = τ<sub>y</sub> + η<sub>p</sub> D`;
                paramStr = `降伏値 τ<sub>y</sub> = ${p.tau_y ? p.tau_y.toFixed(4) : 0} Pa, 塑性粘度 η<sub>p</sub> = ${p.eta_p ? p.eta_p.toFixed(4) : 0} Pa·s`;
            } else if (rheologyData.activeModel === 'casson') {
                formulaStr = `√τ = √τ<sub>y</sub> + √η<sub>c</sub> √D`;
                paramStr = `Casson降伏値 τ<sub>y</sub> = ${p.tau_y ? p.tau_y.toFixed(4) : 0} Pa, Casson粘度 η<sub>c</sub> = ${p.eta_p ? p.eta_p.toFixed(4) : 0} Pa·s`;
            } else if (rheologyData.activeModel === 'powerlaw') {
                formulaStr = `τ = K D<sup>n</sup>`;
                paramStr = `粘性係数 K = ${p.K ? p.K.toFixed(4) : 0} Pa·s<sup>n</sup>, 流動指数 n = ${p.n ? p.n.toFixed(4) : 0}`;
            } else if (rheologyData.activeModel === 'hb') {
                formulaStr = `τ = τ<sub>y</sub> + K D<sup>n</sup>`;
                paramStr = `降伏値 τ<sub>y</sub> = ${p.tau_y ? p.tau_y.toFixed(4) : 0} Pa, 粘性係数 K = ${p.K ? p.K.toFixed(4) : 0} Pa·s<sup>n</sup>, 流動指数 n = ${p.n ? p.n.toFixed(4) : 0}`;
            }

            let allN_pdf = [];
            expBlocks.forEach(b => b.rows.forEach(r => { if (r.N > 0) allN_pdf.push(r.N / 60); }));
            const n_rep_pdf = allN_pdf.length > 0 ? allN_pdf.reduce((a, b) => a + b, 0) / allN_pdf.length : 100 / 60;
            const mu_eff_rep = calcEffectiveViscosity(n_rep_pdf);

            pdfNonNewtContent.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <div><strong style="color:#0f172a;">適合モデル:</strong> ${modelInfo.name}</div>
                    <div><strong style="color:#0f172a;">適合度 R²:</strong> ${modelInfo.r2 ? modelInfo.r2.toFixed(4) : '-'}</div>
                </div>
                <div style="margin-bottom:8px; font-family: monospace; font-size:11px; background:#e2e8f0; padding:6px; border-radius:4px;">
                    <strong>適用式:</strong> ${formulaStr}
                </div>
                <div style="margin-bottom:12px; color:#475569;">[パラメータ] ${paramStr}</div>
                <div style="border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                    <div style="margin-bottom:4px;"><strong style="color:#0f172a;">Metzner-Otto法 定数と代表値</strong></div>
                    <ul style="margin:0; padding-left:16px; color:#334155;">
                        <li>装置定数 k<sub>s</sub> = ${rheologyData.ks.toFixed(2)}</li>
                        <li>有効せん断速度式: &gamma;<sub>eff</sub> = k<sub>s</sub> × N &nbsp;[1/s]</li>
                        <li>代表有効粘度 (N ≈ ${(n_rep_pdf * 60).toFixed(0)} rpm時): &mu;<sub>eff</sub> ≈ ${mu_eff_rep.toFixed(5)} Pa·s</li>
                    </ul>
                </div>
                <div style="border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px;">
                    <div style="margin-bottom:4px;"><strong style="color:#0f172a;">各測定ブロックの有効粘度（Metzner-Otto法）</strong></div>
                    <table style="width:100%; border-collapse:collapse; font-size:9px;">
                        <thead>
                            <tr style="background:#e2e8f0; text-align:center; font-weight:600;">
                                <th style="padding:3px 6px; border:1px solid #cbd5e1; text-align:left;">ブロック名</th>
                                <th style="padding:3px 6px; border:1px solid #cbd5e1;">N (rpm)</th>
                                <th style="padding:3px 6px; border:1px solid #cbd5e1;">&gamma;<sub>eff</sub> = k<sub>s</sub>N (1/s)</th>
                                <th style="padding:3px 6px; border:1px solid #cbd5e1;">&mu;<sub>eff</sub> (Pa·s)</th>
                                <th style="padding:3px 6px; border:1px solid #cbd5e1;">Re<sub>eff</sub> [-]</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expBlocks.map(b => {
                const n_rps_b = b.aveCalculated ? (b.aveCalculated.N / 60) : 0;
                const gamma_eff_b = rheologyData.ks * n_rps_b;
                const mu_eff_b = calcEffectiveViscosity(n_rps_b);
                const Re_eff_b = mu_eff_b > 0 ? (config.rho * n_rps_b * config.d * config.d / mu_eff_b) : 0;
                return `<tr style="text-align:center;">
                                    <td style="padding:3px 6px; border:1px solid #e5e7eb; text-align:left; font-weight:500;">${b.name}</td>
                                    <td style="padding:3px 6px; border:1px solid #e5e7eb; font-family:monospace;">${(n_rps_b * 60).toFixed(1)}</td>
                                    <td style="padding:3px 6px; border:1px solid #e5e7eb; font-family:monospace;">${gamma_eff_b.toFixed(2)}</td>
                                    <td style="padding:3px 6px; border:1px solid #e5e7eb; font-family:monospace; color:#0284c7; font-weight:600;">${mu_eff_b.toFixed(5)}</td>
                                    <td style="padding:3px 6px; border:1px solid #e5e7eb; font-family:monospace;">${Math.round(Re_eff_b).toLocaleString()}</td>
                                </tr>`;
            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            pdfNonNewtSection.style.display = 'block';
        } else {
            pdfNonNewtSection.style.display = 'none';
        }
    } else {
        pdfNonNewtSection.style.display = 'none';
    }

    // 4. Fill Table Data (Averages of blocks)
    const tbody = document.getElementById('pdf-results-tbody');
    tbody.innerHTML = '';

    if (expBlocks.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="7" style="padding: 10px; color: #6b7280; border: 1px solid #e5e7eb;">実験データブロックが登録されていません。</td>`;
        tbody.appendChild(tr);
    } else {
        expBlocks.forEach(b => {
            const tr = document.createElement('tr');
            const reVal = b.aveCalculated ? b.aveCalculated.Re : 0;
            const npVal = b.aveCalculated ? b.aveCalculated.Np : 0;
            const frVal = b.aveCalculated ? b.aveCalculated.Fr : 0;
            const nVal = b.aveCalculated ? b.aveCalculated.N : 0;
            const pVal = b.aveCalculated ? b.aveCalculated.P : 0;
            const pvVal = b.aveCalculated ? b.aveCalculated.Pv : 0;

            tr.innerHTML = `
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-weight: 500;">${b.name}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${nVal.toFixed(1)}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${pVal.toFixed(3)}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${pvVal.toFixed(1)}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${Math.round(reVal)}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${npVal.toFixed(3)}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${frVal.toFixed(3)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 5. Run html2pdf
    const element = document.getElementById('pdf-report-template');

    // Display temporarily to let html2pdf render correctly
    element.style.display = 'block';

    const opt = {
        margin: 15, // standard margin
        filename: `攪拌槽動力特性レポート_${config.expNumber || 'EXP'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    showToast('PDF生成中...', 'info');

    // Give the browser 250ms to render the newly-shown SVG inside the block element
    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
            showToast('PDFレポートがダウンロードされました。', 'success');
        }).catch(err => {
            element.style.display = 'none';
            showToast('PDF生成中にエラーが発生しました。', 'error');
            console.error(err);
        });
    }, 250);
}

// Load Preset List from localStorage
function loadPresetList() {
    const presetSelect = document.getElementById('preset-select');
    presetSelect.innerHTML = '<option value="">-- 実験プリセット選択 --</option>';

    let presets = [];
    try {
        presets = JSON.parse(localStorage.getItem('agitator_presets')) || [];
    } catch (e) {
        console.error("Failed to parse presets from localStorage", e);
    }

    presets.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        presetSelect.appendChild(opt);
    });

    document.getElementById('load-preset-btn').disabled = true;
    document.getElementById('delete-preset-btn').disabled = true;
}

// Save Current Configuration as Preset to localStorage
function savePreset(name) {
    let presets = [];
    try {
        presets = JSON.parse(localStorage.getItem('agitator_presets')) || [];
    } catch (e) {
        presets = [];
    }

    // Parameters to exclude from preset (experiment metadata)
    const excludeKeys = ['expNumber', 'expDate', 'expAuthor'];
    const presetConfig = {};

    Object.keys(config).forEach(key => {
        if (!excludeKeys.includes(key)) {
            presetConfig[key] = config[key];
        }
    });

    const existingIdx = presets.findIndex(p => p.name === name);
    if (existingIdx !== -1) {
        if (!confirm(`プリセット "${name}" は既に存在します。上書きしますか？`)) {
            return;
        }
        presets[existingIdx].config = presetConfig;
    } else {
        presets.push({ name, config: presetConfig });
    }

    try {
        localStorage.setItem('agitator_presets', JSON.stringify(presets));
        showToast(`プリセット "${name}" を保存しました。`, 'success');
        loadPresetList();
        // Select the newly saved preset
        document.getElementById('preset-select').value = name;
        document.getElementById('load-preset-btn').disabled = false;
        document.getElementById('delete-preset-btn').disabled = false;
    } catch (e) {
        showToast('プリセットの保存に失敗しました（容量制限など）。', 'error');
    }
}

// Load Configuration from Named Preset
function loadPreset(name) {
    let presets = [];
    try {
        presets = JSON.parse(localStorage.getItem('agitator_presets')) || [];
    } catch (e) {
        return;
    }

    const preset = presets.find(p => p.name === name);
    if (!preset) {
        showToast(`プリセット "${name}" が見つかりません。`, 'error');
        return;
    }

    // Apply preset values to current configuration
    Object.keys(preset.config).forEach(key => {
        config[key] = preset.config[key];
    });

    // Sync UI fields
    initInputs();
    switchMainTab(config.activeTab || 'rushton');
    recalculateAll();
    showToast(`プリセット "${name}" を読み込みました。`, 'success');
}

// Delete Named Preset from localStorage
function deletePreset(name) {
    let presets = [];
    try {
        presets = JSON.parse(localStorage.getItem('agitator_presets')) || [];
    } catch (e) {
        return;
    }

    const filtered = presets.filter(p => p.name !== name);
    try {
        localStorage.setItem('agitator_presets', JSON.stringify(filtered));
        showToast(`プリセット "${name}" を削除しました。`, 'success');
        loadPresetList();
    } catch (e) {
        showToast('プリセットの削除に失敗しました。', 'error');
    }
}

// Save current application state to localStorage for persistence across reloads
function saveCurrentState() {
    try {
        const state = {
            config: config,
            expBlocks: expBlocks,
            rheologyData: rheologyData
        };
        localStorage.setItem('agitator_current_state', JSON.stringify(state));
        syncDiagramWindow();
    } catch (e) {
        console.error("Failed to save current state to localStorage", e);
    }
}

function syncDiagramWindow() {
    if (!window.diagramWindow || window.diagramWindow.closed) {
        return;
    }
    try {
        window.diagramWindow.postMessage({
            type: 'AgitatorSimRealtimeSync',
            config: { ...config }
        }, '*');
    } catch (e) {
        console.warn('Failed to postMessage to diagram window', e);
    }
}

window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'AgitatorDiagramReady') return;
    syncDiagramWindow();
});

/**
 * 固液有効物性値（比熱容量、密度、熱伝導率、質量分率、容積分率）を計算して返す。
 */
function getEffectiveProperties() {
    const isSL = config.solidLiquidActive;

    // 液物性 (デフォルト)
    const rhoL = config.rho;
    const CpL = config.liquidCp ?? 4184;
    const kL = config.liquidK ?? 0.60;

    if (!isSL) {
        return {
            rho: rhoL,
            Cp: CpL,
            k: kL,
            c_s: 0,
            phi_s: 0,
            k_parallel: kL,
            k_series: kL,
            k_maxwell_lower: kL,
            k_maxwell_upper: kL
        };
    }

    // 固体物性
    const rhoS = config.rho_S ?? 2500;
    const CpS = config.solidCp ?? 800;
    const kS = config.solidK ?? 1.0;

    // 固体質量分率 c_s (0〜1)
    let c_s = 0;
    if (config.solidConcMode === 'wt-total') {
        const w = config.solidConcVal ?? 1.0;
        c_s = Math.max(0, Math.min(0.9999, w / 100));
    } else {
        const X = config.solidConcVal ?? 1.0;
        c_s = X / (100 + X);
    }

    // 有効密度 (逆数和 = スラリー密度)
    let rho_eff = rhoL;
    if (rhoS > 0 && rhoL > 0) {
        rho_eff = 1 / (c_s / rhoS + (1 - c_s) / rhoL);
    }

    // 容積分率 phi_s
    let phi_s = 0;
    if (rhoS > 0 && rhoL > 0) {
        phi_s = (c_s / rhoS) / (c_s / rhoS + (1 - c_s) / rhoL);
    }

    // 有効比熱 (単純な加算則)
    const Cp_eff = c_s * CpS + (1 - c_s) * CpL;

    // 有効熱伝導率
    // 並列モデル (上限値)
    const k_parallel = phi_s * kS + (1 - phi_s) * kL;

    // 直列モデル (下限値)
    let k_series = kL;
    if (kS > 0 && kL > 0) {
        k_series = 1 / (phi_s / kS + (1 - phi_s) / kL);
    }

    // Maxwell下限モデル (液連続相)
    let k_maxwell_lower = kL;
    if (kS > 0 && kL > 0) {
        const numerator = 2 * kL + kS + 2 * phi_s * (kS - kL);
        const denominator = 2 * kL + kS - phi_s * (kS - kL);
        if (denominator !== 0) {
            k_maxwell_lower = kL * (numerator / denominator);
        }
    }

    // Maxwell上限モデル (固連続相)
    let k_maxwell_upper = kS;
    if (kS > 0 && kL > 0) {
        const phi_f = 1 - phi_s;
        const numerator = 2 * kS + kL + 2 * phi_f * (kL - kS);
        const denominator = 2 * kS + kL - phi_f * (kL - kS);
        if (denominator !== 0) {
            k_maxwell_upper = kS * (numerator / denominator);
        }
    }

    const k_eff = phi_s >= 0.2 ? k_maxwell_upper : k_maxwell_lower;

    return {
        rho: rho_eff,
        Cp: Cp_eff,
        k: k_eff, // 固体分率が20%以上なら上限(固連続相)、それ未満なら下限(液連続相)を使用する
        c_s,
        phi_s,
        k_parallel,
        k_series,
        k_maxwell_lower,
        k_maxwell_upper
    };
}

/**
 * 固液系がONかつ有効な場合はスラリー密度 ρ_sl、そうでない場合は液密度 ρ_L を返す。
 */
function getEffectiveDensity() {
    return getEffectiveProperties().rho;
}

/**
 * 固液有効物性値のUI表示を更新する。
 */
function updateEffectivePropertiesUI() {
    const elRho = document.getElementById('sl-eff-rho');
    if (!elRho) return; // UIが存在しない場合は何もしない

    const elWs = document.getElementById('sl-eff-ws');
    const elPhis = document.getElementById('sl-eff-phis');
    const elMu = document.getElementById('sl-eff-mu');
    const elCp = document.getElementById('sl-eff-cp');
    const elKSingle = document.getElementById('sl-eff-k-single');
    const elKMaxwellLower = document.getElementById('sl-eff-k-maxwell-lower');
    const elKMaxwellUpper = document.getElementById('sl-eff-k-maxwell-upper');
    const elKParallel = document.getElementById('sl-eff-k-parallel');
    const elKSeries = document.getElementById('sl-eff-k-series');

    // 1. 有効比熱 Cp_eff
    if (elCp) {
        if (config.solidLiquidActive) {
            const props = getEffectiveProperties();
            elCp.textContent = props.Cp.toFixed(0);
        } else {
            elCp.textContent = config.liquidCp.toFixed(0);
        }
    }

    // 2. 有効密度 ρ_eff
    if (elRho) {
        if (config.solidLiquidActive) {
            const props = getEffectiveProperties();
            const rhoL = config.rho;
            const rhoS = config.rho_S ?? 2500;
            const eps = (rhoS * (1 - props.c_s)) / (rhoS * (1 - props.c_s) + rhoL * props.c_s);
            elRho.innerHTML = `${props.rho.toFixed(1)} <span style="font-size:0.72rem;opacity:0.8;">(ε = ${eps.toFixed(4)})</span>`;
        } else {
            elRho.textContent = config.rho.toFixed(1);
        }
    }

    // 3. 有効粘度 μ_eff (代表粘度)
    if (elMu) {
        let allN = [];
        expBlocks.forEach(b => b.rows.forEach(r => { if (r.N > 0) allN.push(r.N / 60); }));
        const n_rep = allN.length > 0 ? allN.reduce((a, b) => a + b, 0) / allN.length : 100 / 60;
        const isNewt = rheologyData.activeModel === 'newtonian';

        if (!isNewt && typeof calcEffectiveViscosity === 'function') {
            const mu_eff = calcEffectiveViscosity(n_rep);
            elMu.innerHTML = `${mu_eff.toFixed(4)} <span style="font-size:0.75rem;opacity:0.8;">(N≈${(n_rep * 60).toFixed(0)}rpm)</span>`;
        } else {
            elMu.textContent = config.mu.toFixed(4);
        }
    }

    // 4. 固液系が非アクティブな場合
    if (!config.solidLiquidActive) {
        if (elWs) elWs.textContent = '--';
        if (elPhis) elPhis.textContent = '--';
        if (elKSingle) elKSingle.textContent = config.liquidK.toFixed(3);
        if (elKMaxwellLower) elKMaxwellLower.textContent = '--';
        if (elKMaxwellUpper) elKMaxwellUpper.textContent = '--';
        if (elKParallel) elKParallel.textContent = '--';
        if (elKSeries) elKSeries.textContent = '--';
        return;
    }

    // 5. 固液系がアクティブな場合の追加項目更新
    const props = getEffectiveProperties();
    if (elWs) elWs.textContent = (props.c_s * 100).toFixed(2) + ' wt%';
    if (elPhis) elPhis.textContent = (props.phi_s * 100).toFixed(2) + ' vol%';

    // 熱伝導率詳細
    const isUpper = props.phi_s >= 0.2;
    if (elKMaxwellLower) {
        if (!isUpper) {
            elKMaxwellLower.innerHTML = `${props.k_maxwell_lower.toFixed(3)} <span style="font-size:0.7rem; color:var(--accent-color); font-weight:bold;">(適用中)</span>`;
        } else {
            elKMaxwellLower.textContent = props.k_maxwell_lower.toFixed(3);
        }
    }
    if (elKMaxwellUpper) {
        if (isUpper) {
            elKMaxwellUpper.innerHTML = `${props.k_maxwell_upper.toFixed(3)} <span style="font-size:0.7rem; color:var(--accent-color); font-weight:bold;">(適用中)</span>`;
        } else {
            elKMaxwellUpper.textContent = props.k_maxwell_upper.toFixed(3);
        }
    }
    if (elKParallel) elKParallel.textContent = props.k_parallel.toFixed(3);
    if (elKSeries) elKSeries.textContent = props.k_series.toFixed(3);
}

// -----------------------------------------------------------
// Solid-Liquid Particle Suspension (Zwietering Njs) Calculations
// -----------------------------------------------------------

function updateSolidConcLabel() {
    const label = document.getElementById('solid-conc-label');
    if (!label) return;
    if (config.solidConcMode === 'wt-ratio') {
        label.innerHTML = '固体濃度 X (wt% (対液)) <span style="font-size:0.7rem;opacity:0.6;">(質量比×100)</span>';
    } else {
        label.innerHTML = '全体重量濃度 w (wt% (全体)) <span style="font-size:0.7rem;opacity:0.6;">(全懸濁液基準)</span>';
    }
}

function toggleSFactorCustom() {
    const container = document.getElementById('s-factor-custom-container');
    if (!container) return;
    if (config.solidLiquidActive && config.sFactorMode === 'custom') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function getZwieteringPresetS() {
    const { impellerType, headType } = config;
    const isFlatBottom = headType === 'flat';
    if (isFlatBottom) {
        switch (impellerType) {
            case 'flat-turbine': return 7.0;
            case 'flat-paddle': return 7.5;
            case 'pitched-paddle': return 5.0;
            case 'propeller': return 9.0;
            case 'faudler': return 7.0;
            default: return 7.0;
        }
    } else {
        // Dished bottom
        switch (impellerType) {
            case 'flat-turbine': return 5.2;
            case 'flat-paddle': return 5.6;
            case 'pitched-paddle': return 4.6;
            case 'propeller': return 8.2;
            case 'faudler': return 6.0;
            default: return 6.0;
        }
    }
}

function calculateNjs() {
    const dp = (config.dp_um ?? 150) * 1e-6; // μm -> m
    const rhoS = config.rho_S ?? 2500;
    const rhoL = config.rho;
    const delta_rho = rhoS - rhoL;

    if (delta_rho <= 0) {
        return {
            error: "粒子密度が液密度以下です（浮上または中性浮遊）",
            Njs_rpm: 0,
            Njs_rps: 0,
            S: 0,
            delta_rho: delta_rho,
            X: 0,
            nu: 0
        };
    }

    let X = config.solidConcVal ?? 1.0;
    if (config.solidConcMode === 'wt-total') {
        const w = config.solidConcVal ?? 1.0;
        if (w >= 100) {
            return {
                error: "全体重量濃度は100wt%未満で入力してください",
                Njs_rpm: 0,
                Njs_rps: 0,
                S: 0,
                delta_rho: delta_rho,
                X: 0,
                nu: 0
            };
        }
        X = (w / (100 - w)) * 100;
    }

    let S = 5.0;
    if (config.sFactorMode === 'auto') {
        S = getZwieteringPresetS();
    } else {
        S = config.sFactorCustom ?? 5.0;
    }

    const d = config.d;
    const g = config.g;

    // Newton / non-Newtonian solver
    let Njs_rps = 1.0; // initial guess
    const isNewt = (rheologyData.activeModel === 'newtonian' || !rheologyData.activeModel);

    if (isNewt) {
        const nu = config.mu / rhoL;
        Njs_rps = S * Math.pow(nu, 0.1) * Math.pow(dp, 0.2) * Math.pow(g * delta_rho / rhoL, 0.45) * Math.pow(X, 0.13) * Math.pow(d, -0.85);
        return {
            Njs_rps,
            Njs_rpm: Njs_rps * 60,
            S,
            delta_rho,
            X,
            nu,
            mu: config.mu
        };
    } else {
        // Implicit solver (fixed point iteration)
        const maxIter = 100;
        const tolerance = 1e-5;
        let nu = 0;
        let mu_eff = 0;

        for (let iter = 0; iter < maxIter; iter++) {
            mu_eff = calcEffectiveViscosity(Njs_rps);
            nu = mu_eff / rhoL;
            const next_Njs_rps = S * Math.pow(nu, 0.1) * Math.pow(dp, 0.2) * Math.pow(g * delta_rho / rhoL, 0.45) * Math.pow(X, 0.13) * Math.pow(d, -0.85);

            if (Math.abs(next_Njs_rps - Njs_rps) < tolerance) {
                Njs_rps = next_Njs_rps;
                break;
            }
            Njs_rps = 0.7 * next_Njs_rps + 0.3 * Njs_rps;
        }

        return {
            Njs_rps,
            Njs_rpm: Njs_rps * 60,
            S,
            delta_rho,
            X,
            nu,
            mu: mu_eff
        };
    }
}

function updateFlowCharacteristics() {
    const elNqd = document.getElementById('flow-res-Nqd');
    const elNqc = document.getElementById('flow-res-Nqc');
    const elQd = document.getElementById('flow-res-Qd');
    const elQdNjs = document.getElementById('flow-res-Qd-njs');
    const elQc = document.getElementById('flow-res-Qc');
    const elQcNjs = document.getElementById('flow-res-Qc-njs');
    const elNc = document.getElementById('flow-res-Nc');
    const elNcNjs = document.getElementById('flow-res-Nc-njs');

    const d = config.d || 0.060;
    const DT = config.DT || 0.105;
    const b = config.b || 0.020;
    const np = config.np || 4;

    let Np_turb = 1.5;
    try {
        const npRes = calculateNpCurve(1e5);
        Np_turb = npRes.Np || npRes.Np0 || 1.5;
    } catch (e) {
        console.error("Failed to estimate Np_turb", e);
    }

    const term1 = Math.pow(Math.pow(np, 0.7) * (b / d), 0.25);
    const term2 = Math.pow(DT / d, 0.34);
    const term3 = Math.pow(Np_turb, 0.5);
    const Nqd = 0.32 * term1 * term2 * term3;

    const ratio_DT_d = DT / d;
    const Nqc = Nqd * (1 + 0.16 * (Math.pow(ratio_DT_d, 2) - 1));

    if (elNqd) elNqd.textContent = Nqd.toFixed(3);
    if (elNqc) elNqc.textContent = Nqc.toFixed(3);

    const V_liq = calcLiquidVolumeForPv() || 0.001;

    const N_sim = config.simSpeed || 0;
    const n_sim_rps = N_sim / 60;
    const Qd_sim = Nqd * n_sim_rps * Math.pow(d, 3) * 60000;
    const Qc_sim = Nqc * n_sim_rps * Math.pow(d, 3) * 60000;
    const Nc_sim = (Qc_sim * 1e-3) / V_liq;

    if (elQd) elQd.innerHTML = `${Qd_sim.toFixed(2)} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-secondary);">L/min</span>`;
    if (elQc) elQc.innerHTML = `${Qc_sim.toFixed(2)} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-secondary);">L/min</span>`;
    if (elNc) elNc.innerHTML = `${Nc_sim.toFixed(2)} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-secondary);">回/分</span>`;

    const resNjs = calculateNjs();
    if (resNjs && !resNjs.error && resNjs.Njs_rpm > 0) {
        const N_njs = resNjs.Njs_rpm;
        const n_njs_rps = N_njs / 60;
        const Qd_njs = Nqd * n_njs_rps * Math.pow(d, 3) * 60000;
        const Qc_njs = Nqc * n_njs_rps * Math.pow(d, 3) * 60000;
        const Nc_njs = (Qc_njs * 1e-3) / V_liq;

        if (elQdNjs) elQdNjs.textContent = `(Njs時: ${Qd_njs.toFixed(2)} L/min)`;
        if (elQcNjs) elQcNjs.textContent = `(Njs時: ${Qc_njs.toFixed(2)} L/min)`;
        if (elNcNjs) elNcNjs.textContent = `(Njs時: ${Nc_njs.toFixed(2)} 回/分)`;
    } else {
        if (elQdNjs) elQdNjs.textContent = `(Njs時: -- L/min)`;
        if (elQcNjs) elQcNjs.textContent = `(Njs時: -- L/min)`;
        if (elNcNjs) elNcNjs.textContent = `(Njs時: -- 回/分)`;
    }
}

function updateSimulatorResults() {
    const res = calculateNjs();
    const warnBox = document.getElementById('sim-warning-box');
    const warnText = document.getElementById('sim-warning-text');

    if (!warnBox) return;

    if (res.error) {
        warnBox.style.display = 'block';
        warnText.textContent = res.error;

        document.getElementById('sim-res-S').textContent = '--';
        document.getElementById('sim-res-deltarho').textContent = '-- kg/m³';
        document.getElementById('sim-res-nu').textContent = '-- m²/s';
        document.getElementById('sim-res-X').textContent = '-- wt%';
        document.getElementById('sim-res-njs-rps').textContent = '-- 1/s';
        document.getElementById('sim-res-Njs-rpm').textContent = '-- rpm';
        document.getElementById('sim-res-P-njs').textContent = '-- W';
        document.getElementById('sim-res-Pv-njs').textContent = '-- W/m³';

        updateSimStatusBadge(0, 100);
        updateFlowCharacteristics();
        return;
    }

    warnBox.style.display = 'none';

    document.getElementById('sim-res-S').textContent = res.S.toFixed(2);
    document.getElementById('sim-res-deltarho').textContent = Math.round(res.delta_rho) + ' kg/m³';
    document.getElementById('sim-res-nu').textContent = res.nu.toExponential(4) + ' m²/s';
    document.getElementById('sim-res-X').textContent = res.X.toFixed(3) + ' wt%';
    document.getElementById('sim-res-njs-rps').textContent = res.Njs_rps.toFixed(3) + ' 1/s';
    document.getElementById('sim-res-Njs-rpm').textContent = Math.round(res.Njs_rpm) + ' rpm';

    const effRho = getEffectiveDensity();
    const Re_Njs = (effRho * res.Njs_rps * Math.pow(config.d, 2)) / res.mu;
    const { Np } = calculateNpCurve(Re_Njs);
    const P_njs = Np * effRho * Math.pow(res.Njs_rps, 3) * Math.pow(config.d, 5);
    const V = calcLiquidVolumeForPv();
    const Pv_njs = P_njs / V;

    document.getElementById('sim-res-P-njs').textContent = P_njs.toFixed(3) + ' W';
    document.getElementById('sim-res-Pv-njs').textContent = Pv_njs.toFixed(1) + ' W/m³';

    updateSimStatusBadge(config.simSpeed, res.Njs_rpm);
    updateCavernDiameter();
    if (typeof _updateNjsCache === 'function') _updateNjsCache();
    updateFlowCharacteristics();
}

function updateSimulatorResultsOnly() {
    const res = calculateNjs();
    if (!res.error) {
        updateSimStatusBadge(config.simSpeed, res.Njs_rpm);
    }
    updateCavernDiameter();
    if (typeof _updateNjsCache === 'function') _updateNjsCache();
    updateFlowCharacteristics();
}

// 降伏応力流体用キャバーン径（流動領域）の推算 (Elson et al.)
function updateCavernDiameter() {
    const cavernRow = document.getElementById('cavern-row');
    const dcLabel = document.getElementById('sim-res-cavern-dc');
    if (!cavernRow || !dcLabel) return;

    const mod = rheologyData?.activeModel;
    const isYieldFluid = mod === 'bingham' || mod === 'casson' || mod === 'hb';

    const models = rheologyData?.samples?.[rheologyData?.activeSample] || [];
    const modelInfo = models.find(m => m.modelId === mod);
    const pr = modelInfo?.params;

    if (!isYieldFluid || !pr || !pr.tau_y || pr.tau_y <= 0) {
        cavernRow.style.display = 'none';
        config.cavern_Dc = null;
        return;
    }

    const n_rps = config.simSpeed / 60;
    if (n_rps <= 0) {
        dcLabel.textContent = '0.000 m';
        config.cavern_Dc = 0;
        cavernRow.style.display = 'table-row';
        return;
    }

    // 現在の回転数でのトルク T を計算
    const mu_eff = calcEffectiveViscosity(n_rps);
    const effRho = getEffectiveDensity();
    const Re = (effRho * n_rps * Math.pow(config.d, 2)) / mu_eff;
    const { Np } = calculateNpCurve(Re);
    const P = Np * effRho * Math.pow(n_rps, 3) * Math.pow(config.d, 5);
    const T = P / (2 * Math.PI * n_rps);  // トルク T [N·m]

    let Dc;
    if (config.cavernModel === 'cylindrical') {
        const alpha = config.cavernAlpha ?? 0.7;
        Dc = Math.pow(
            T / (Math.PI * pr.tau_y * (alpha / 2 + 1 / 6)),
            1 / 3
        );
    } else if (config.cavernModel === 'torus') {
        // トーラスモデル: Dc = (3/(π³(1-β²)) · T/τy)^(1/3)
        // β = d/Dc → 反復計算で解く
        const d = config.d;
        let Dc_iter = d * 2.0; // 初期推定値
        for (let i = 0; i < 50; i++) {
            const beta = d / Dc_iter;
            const beta2 = Math.min(0.99, beta * beta); // β²<1 を保証
            const Dc_next = Math.pow(
                (3 / (Math.pow(Math.PI, 3) * (1 - beta2))) * (T / pr.tau_y),
                1 / 3
            );
            if (Math.abs(Dc_next - Dc_iter) < 1e-7) { Dc_iter = Dc_next; break; }
            Dc_iter = 0.6 * Dc_next + 0.4 * Dc_iter; // 緩和係数
        }
        Dc = Dc_iter;
    } else {
        // 球形モデル: Dc = (6T / (π·τy))^(1/3)
        Dc = Math.pow(
            (6 * T) / (Math.PI * pr.tau_y),
            1 / 3
        );
    }

    // キャバーン径は槽径 DT を超えない（壁に到達）
    if (Dc > config.DT) {
        Dc = config.DT;
    }

    dcLabel.textContent = Dc.toFixed(3) + ' m';
    config.cavern_Dc = Dc;
    cavernRow.style.display = 'table-row';
}

function updateSimStatusBadge(currentN, njsN) {
    const badge = document.getElementById('sim-status-badge');
    if (!badge) return;

    if (currentN === 0) {
        badge.textContent = '完全沈降';
        badge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        badge.style.color = '#ef4444';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    } else if (currentN < 0.9 * njsN) {
        badge.textContent = '不完全浮遊';
        badge.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        badge.style.color = '#f59e0b';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.2)';
    } else if (currentN < 1.2 * njsN) {
        badge.textContent = '完全浮遊';
        badge.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        badge.style.color = '#10b981';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    } else {
        badge.textContent = '均一分散';
        badge.style.backgroundColor = 'rgba(6, 182, 212, 0.1)';
        badge.style.color = '#06b6d4';
        badge.style.borderColor = 'rgba(6, 182, 212, 0.2)';
    }
}

function syncSimulatorSpeedWithBlock() {
    if (expBlocks.length > 0) {
        const firstBlock = expBlocks[0];
        let sumN = 0;
        firstBlock.rows.forEach(r => sumN += r.N);
        const aveN = sumN / firstBlock.rows.length;
        config.simSpeed = Math.round(aveN);

        syncSpeedUIElements();
    }
}

// -----------------------------------------------------------
// Canvas 2D Particle Simulation Engine
// 設計方針:
//   1. LPT (Lagrangian Particle Tracking) — 粒子に運動方程式を積分
//   2. 格子ベースの温度場 — グリッドで温度を計算・拡散
//   3. 浮力 — 格子温度から粒子ごとに計算して付与
//   4. 乱流 — OU (Ornstein-Uhlenbeck) ノイズで表現
// -----------------------------------------------------------

let simCanvas = null;
let simCtx = null;
let simParticles = [];
let simCoilPositions = [];
let simAnimId = null;
let simImpellerAngle = 0;
let simLastFrameTime = null;
let _cachedNjsResult = { error: 'not initialized', Njs_rpm: 0 };
function _updateNjsCache() { _cachedNjsResult = calculateNjs(); }

// ── 格子温度場 ──────────────────────────────────────────────
// グリッドサイズ（粒子シミュレータ用、小さめで高速）
const TEMP_GRID_COLS = 30;
const TEMP_GRID_ROWS = 22;
let tempGrid = null;          // Float32Array[COLS*ROWS]  各セルの温度 [°C]
let tempGridInitialized = false;

function initTempGrid(T0) {
    tempGrid = new Float32Array(TEMP_GRID_COLS * TEMP_GRID_ROWS).fill(T0);
    tempGridInitialized = true;
}

/**
 * 格子温度場を1ステップ更新する。
 * ・壁/コイル境界セルはジャケット温度(=mediaTempIn)に向けて加熱/冷却
 * ・拡散項（陽解法 Δt=dt_sim, 係数 α_eff）
 * ・インペラ近傍の強制対流ソース
 */
function updateTempGrid(coords, dt_sim) {
    if (!tempGrid) return;
    const { lx, rx, y_liquid, y_deepest, y_cyl, D_px, cx, scale } = coords;
    const cols = TEMP_GRID_COLS;
    const rows = TEMP_GRID_ROWS;
    const cellW = (rx - lx) / cols;
    const cellH = (y_deepest - y_liquid) / rows;

    const T_wall = config.mediaTempIn ?? 80;  // ジャケット/コイル温度 [°C]
    const T_bulk = heatSimTemp;               // バルク液温（伝熱シミュで更新される）
    const T_amb = config.ambientTemp ?? 25;   // 環境温度 [°C]

    // --- 有効熱拡散率 α_eff ---
    // 分子スケールの熱拡散率は物性値から計算する: α = k / (ρ * Cp) [m²/s]
    const effProps = getEffectiveProperties();
    // 安全マージン付きで物性値から α_mol を算出
    let alpha_mol = (effProps.k || 0.6) / Math.max(1e-6, (effProps.rho || 998) * (effProps.Cp || 4184));
    // 異常値対策: 極端に小さい/負の値を下限でクリップ
    alpha_mol = Math.max(alpha_mol, 1e-9);
    const Re_liq = calculateReVal((config.simSpeed ?? 300) / 60);
    // 乱流拡散係数: 有効粘度と代表速度・長さから渦粘性を推定し Pr_t で割る
    // 物理ベースの推算: ν_t ≈ C_t * U_char * L_char, α_t = ν_t / Pr_t
    const d_val = config.d ?? 0.060; // [m]
    const n_rps = (config.simSpeed ?? 300) / 60; // [1/s]
    const Pr_t = 0.9;
    // 代表速度: インペラの周速（tip speed）を使用
    const U_tip = 2 * Math.PI * (d_val * 0.5) * n_rps; // [m/s]
    const L_char = Math.max(0.001, d_val * 0.5); // [m]
    const C_t = 0.08; // 経験係数（調整可能）
    const nu_t_phys = C_t * U_tip * L_char; // [m²/s]
    const alpha_t = nu_t_phys / Pr_t;
    const alpha_eff_phys = alpha_mol + alpha_t; // [m²/s]

    // スケール変換: [px²/step] を [m²/s] に対応させる
    //   1 px = (DT_m / D_px) m → 1 px² = (DT_m/D_px)² m²
    const m_per_px = (config.DT ?? 0.105) / D_px;
    const alpha_eff_px = alpha_eff_phys / (m_per_px * m_per_px);  // px²/s
    // dt_sim は秒単位なので α_eff_px * dt_sim が px²/step
    // 安定条件: α_eff_px * dt / min(cellW,cellH)^2 ≤ 0.25
    const minCell = Math.min(cellW, cellH);
    const r_fac = Math.min(0.25, (alpha_eff_px * dt_sim) / (minCell * minCell));

    const next = new Float32Array(tempGrid);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            const xc = lx + (col + 0.5) * cellW;
            const yc = y_liquid + (row + 0.5) * cellH;

            // 容器外セルはスキップ
            const yBot = getVesselBottomY(xc, coords);
            if (yc > yBot || xc < lx || xc > rx) {
                next[idx] = T_bulk;
                continue;
            }

            // --- 拡散項（4近傍中央差分） ---
            const get = (r, c) => {
                if (r < 0 || r >= rows) return tempGrid[idx]; // 断熱境界
                if (c < 0 || c >= cols) return tempGrid[idx];
                const i2 = r * cols + c;
                const xc2 = lx + (c + 0.5) * cellW;
                const yc2 = y_liquid + (r + 0.5) * cellH;
                const yB2 = getVesselBottomY(xc2, coords);
                if (yc2 > yB2) return tempGrid[idx]; // 壁の外は自セルで鏡像
                return tempGrid[i2];
            };
            const laplacian = get(row, col - 1) + get(row, col + 1)
                + get(row - 1, col) + get(row + 1, col)
                - 4 * tempGrid[idx];
            next[idx] += r_fac * laplacian;

            // --- 移流項（温度差による自然対流） ---
            // 温度勾配を中央差分で計算
            const T_xp = get(row, col + 1);
            const T_xm = get(row, col - 1);
            const T_yp = get(row + 1, col);
            const T_ym = get(row - 1, col);
            const dTdx = (T_xp - T_xm) / (2 * cellW + 1e-9);  // [°C / px]
            const dTdy = (T_yp - T_ym) / (2 * cellH + 1e-9);  // [°C / px]

            // 温度差から浮力速度を推定
            const T_local = tempGrid[idx];
            const dT = T_local - T_bulk;
            const g_val = config.g || 9.806;
            const beta_val = 2e-4;

            // 浮力による鉛直速度 [m/s] を格子単位に変換
            const v_buoy_phys = g_val * beta_val * dT;  // [m/s]
            const v_buoy_px = v_buoy_phys * scale * dt_sim;  // [px]

            // 温度勾配から水平移流速度を推定（温度が高い側へ広がる傾向）
            const C_conv = 0.15;  // 移流強度係数（調整可能）
            const u_conv_px = -C_conv * dTdx;  // [px/frame]

            // 移流項: -u*∂T/∂x - v*∂T/∂y
            const advection = u_conv_px * dTdx + v_buoy_px * dTdy;
            next[idx] -= advection * dt_sim;

            // --- 水面層の温水拡散を強める ---
            if (row === 0 || row === 1) {
                const topSpreadFactor = r_fac * (row === 0 ? 0.95 : 0.45);
                const topHorizLap = (get(row, col - 1) + get(row, col + 1)) - 2 * tempGrid[idx];
                next[idx] += topSpreadFactor * topHorizLap;
            }

            // --- 壁(左右)境界セル: ジャケット温度に向けた加熱/冷却 ---
            const distWall = Math.min(xc - lx, rx - xc);
            if (distWall < cellW * 1.5) {
                const rate = 0.08 * dt_sim;
                next[idx] += (T_wall - next[idx]) * rate;
            }
            // 底面境界
            const distBot = yBot - yc;
            if (distBot < cellH * 1.5) {
                const rate = 0.06 * dt_sim;
                next[idx] += (T_wall - next[idx]) * rate;
            }

            // --- 自然対流を想定した自由表面 Newton 冷却 ---
            const distSurf = yc - y_liquid;
            if (distSurf <= cellH * 1.5) {
                const surfFactor = Math.max(0, 1 - distSurf / (cellH * 1.5));
                const h_surface = 0.02 + 0.03 * Math.min(1, Re_liq / 1000);
                next[idx] += (T_amb - next[idx]) * h_surface * dt_sim * surfFactor;
            }

            // --- 底面付近の停滞冷水プールを保持 ---
            const impellerZone = (config.d ?? 0.06) * scale * 1.2;
            const farFromImpeller = Math.abs(xc - cx) > impellerZone;
            if (row >= rows - 2 && farFromImpeller && tempGrid[idx] < T_bulk) {
                const bottomPoolRetention = 0.05 * dt_sim;
                next[idx] += (tempGrid[idx] - next[idx]) * bottomPoolRetention;
            }

            // --- コイル境界: 近傍セルをT_wallへ ---
            if (config.coilActive && simCoilPositions.length > 0) {
                for (const c_ of simCoilPositions) {
                    const dx = xc - c_.x;
                    const dy = yc - c_.y;
                    if (Math.sqrt(dx * dx + dy * dy) < c_.r + cellW) {
                        next[idx] += (T_wall - next[idx]) * 0.15 * dt_sim;
                        break;
                    }
                }
            }

            // --- インペラ近傍の強制対流混合: バルク温度に向けて強引にリセット ---
            const clearance_px = (config.clearance ?? 0.02) * scale;
            const b_px = (config.b ?? 0.02) * scale;
            const y_bot_imp = y_deepest - clearance_px - b_px / 2;
            const rImp = (config.d ?? 0.06) * scale / 2;
            const stages_y_t = getSubmergedImpellerStagePositions(coords);
            for (const y_imp of stages_y_t) {
                const ddx = xc - cx;
                const ddy = yc - y_imp;
                const d2 = ddx * ddx + ddy * ddy;
                if (d2 < rImp * rImp) {
                    // インペラ翼先端内: バルク温度に向けて強混合
                    const mixRate = Math.min(0.5, 0.1 * (config.simSpeed / 300) * dt_sim * 60);
                    next[idx] += (T_bulk - next[idx]) * mixRate;
                    break;
                }
            }
        }
    }
    tempGrid = next;
}

/**
 * 格子から粒子位置の温度を双線形補間で取得する。
 */
function getTempAtPoint(px, py, coords) {
    if (!tempGrid) return heatSimTemp;
    const { lx, y_liquid, y_deepest, rx } = coords;
    const cols = TEMP_GRID_COLS;
    const rows = TEMP_GRID_ROWS;
    const cellW = (rx - lx) / cols;
    const cellH = (y_deepest - y_liquid) / rows;

    const col = (px - lx) / cellW - 0.5;
    const row = (py - y_liquid) / cellH - 0.5;
    const c0 = Math.floor(col), c1 = c0 + 1;
    const r0 = Math.floor(row), r1 = r0 + 1;
    const fc = col - c0, fr = row - r0;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const get = (r, c) => {
        const ri = clamp(r, 0, rows - 1);
        const ci = clamp(c, 0, cols - 1);
        return tempGrid[ri * cols + ci];
    };
    return (1 - fr) * ((1 - fc) * get(r0, c0) + fc * get(r0, c1))
        + fr * ((1 - fc) * get(r1, c0) + fc * get(r1, c1));
}

// ── OU (Ornstein-Uhlenbeck) 乱流ノイズ ─────────────────────
// 各粒子に持たせる OU 状態: { wx, wy }
// dw = -θ w dt + σ dW
// ここで θ = 1/τ_L (Lagrangian積分時間スケールの逆数), σ^2 = 2 u'^2 / τ_L
function ouStep(wx, wy, theta, sigma, dt_sim) {
    const decay = Math.exp(-theta * dt_sim);
    const noise_std = sigma * Math.sqrt((1 - decay * decay) / (2 * theta) * 2 * theta);
    return {
        wx: decay * wx + noise_std * (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.7071,
        wy: decay * wy + noise_std * (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.7071
    };
}

// ── 平均流速場の計算（既存ロジックを保持） ─────────────────

function getVesselVisualCoords(canvasW, canvasH) {
    const useDynamic = (canvasW != null && canvasH != null);
    const cx = useDynamic ? Math.round(canvasW / 2) : 225;

    // 容器全体の高さ = H + hb（鏡板）をキャンバス高さの 75% に収める
    // hb/DT比 = headTypeに依存（semi-elliptical: 0.25, hemispherical: 0.5）
    // H/DT 比から D_px を逆算する
    const hb_ratio = config.headType === 'hemispherical' ? 0.5
        : config.headType === 'semi-elliptical' ? 0.25
            : config.headType === 'dish' ? 0.1935 : 0;
    const vessel_H_ratio = config.H / config.DT + hb_ratio; // 容器全高 / DT

    const y_top_frac = 0.08; // キャンバス上端マージン
    const y_bot_frac = 0.05; // キャンバス下端マージン
    const available_H_frac = 1 - y_top_frac - y_bot_frac;

    let D_px;
    if (useDynamic) {
        // 縦方向に収まるD_px
        const D_px_from_H = Math.round((canvasH * available_H_frac) / vessel_H_ratio);
        // 横方向に収まるD_px
        const D_px_from_W = Math.round(canvasW * 0.53);
        D_px = Math.min(D_px_from_H, D_px_from_W);
    } else {
        D_px = 240;
    }

    const scale = D_px / config.DT;

    let hb = 0;
    if (config.headType === 'semi-elliptical') {
        hb = D_px / 4;
    } else if (config.headType === 'dish') {
        hb = D_px * 0.1935;
    } else if (config.headType === 'hemispherical') {
        hb = D_px / 2;
    }

    const y_top = useDynamic ? Math.round(canvasH * y_top_frac) : 45;
    const H_px = Math.max(0, config.H * scale);
    const y_cyl = y_top + H_px;
    const y_deepest = y_cyl + hb;

    const liquidHeight = getLiquidHeight();
    const h_liquid_px = liquidHeight * scale;
    let y_liquid = y_deepest - h_liquid_px;
    if (y_liquid < y_top) y_liquid = y_top;

    const lx = cx - D_px / 2;
    const rx = cx + D_px / 2;

    return { cx, D_px, scale, hb, y_top, y_deepest, y_cyl, y_liquid, lx, rx };
}

function getVesselBottomY(x, coords) {
    const { cx, D_px, hb, y_cyl, lx, rx } = coords;
    if (x <= lx) return y_cyl;
    if (x >= rx) return y_cyl;

    if (config.headType === 'flat') {
        return y_cyl;
    } else if (config.headType === 'hemispherical') {
        const R = D_px / 2;
        const dx = x - cx;
        return y_cyl + Math.sqrt(Math.max(0, R * R - dx * dx));
    } else {
        const a = D_px / 2;
        const b = hb;
        const dx = x - cx;
        return y_cyl + b * Math.sqrt(Math.max(0, 1 - (dx * dx) / (a * a)));
    }
}

function getSharedSurfaceY(x_val, coords, rpm, t_sec) {
    const { cx, D_px, scale, y_liquid, lx } = coords;

    const Fr = (rpm / 60) * (rpm / 60) * config.d / (config.g || 9.81);
    let vortexDepth_m = 0;
    if (!config.baffleActive && rpm > 10) {
        vortexDepth_m = 0.5 * config.d * Math.pow(Fr, 0.5);
    } else if (config.baffleActive && rpm > 50) {
        vortexDepth_m = 0.05 * config.d * Math.pow(Fr, 0.3);
    }
    const vortexDepth = Math.min(D_px * 0.8, vortexDepth_m * scale);

    const waveAmp = (rpm / 300) * 4;
    const waveFreq = (rpm / 60) * Math.PI * 2;

    const u = (x_val - cx) / (D_px / 2);
    let waveOffset = 0;
    if (rpm > 5) {
        const w1 = Math.sin(waveFreq * t_sec - (2 * Math.PI / D_px) * (x_val - lx));
        const w2 = Math.cos(waveFreq * 1.7 * t_sec + (4 * Math.PI / D_px) * (x_val - lx));
        waveOffset = waveAmp * (w1 + 0.35 * w2);
    }
    const y_surf = y_liquid + vortexDepth * (0.5 - u * u) + waveOffset;
    return Math.max(y_liquid - 10, y_surf);
}

function getCavernDecay(x, y, coords) {
    if (!config.cavern_Dc || config.cavern_Dc <= 0) return 1.0;

    const { cx, D_px, scale, y_deepest, y_liquid } = coords;
    const cavernRadius = (config.cavern_Dc / 2) * scale;
    const b_px = config.b * scale;
    const clearance_px = config.clearance * scale;

    const stages_y = getImpellerStagePositions(coords);

    let minDistOut = Infinity;
    for (const y_imp_s of stages_y) {
        let distOut = 0;
        if (config.cavernModel === 'cylindrical') {
            const hc = cavernRadius * 1.5;
            distOut = Math.max(0, Math.max(Math.abs(x - cx) - cavernRadius, Math.abs(y - y_imp_s) - hc / 2));
        } else {
            const dist3d = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - y_imp_s, 2));
            distOut = Math.max(0, dist3d - cavernRadius);
        }
        if (distOut < minDistOut) minDistOut = distOut;
    }

    if (minDistOut <= 0) return 1.0;
    return Math.max(0, 1.0 - (minDistOut / 75.0));
}

/**
 * 平均流速場（px/frame）を返す。
 * LPT における mean flow velocity として使用される。
 */
function getMeanFlowVelocity(x, y, speed_rpm, coords, relVortexX, relVortexY) {
    const { cx, D_px, scale, y_deepest, y_liquid, lx, rx } = coords;

    const rpm = speed_rpm || 0;
    let vortexDepth = Math.pow(rpm / 600, 2) * D_px * 0.05;
    if (config.baffleActive) vortexDepth *= 0.12;
    const maxAllowedDepth = Math.max(0, (y_deepest - y_liquid) * 0.6);
    vortexDepth = Math.min(vortexDepth, maxAllowedDepth);

    let waveOffset = 0;
    if (rpm > 5) {
        const t = performance.now() / 1000;
        const waveAmp = (rpm / 600) * (config.baffleActive ? 0.7 : 2.2);
        const waveFreq = 2.0 + (rpm / 300) * 5.0;
        const w1 = Math.sin(waveFreq * t - (2 * Math.PI / D_px) * (x - lx));
        const w2 = Math.cos(waveFreq * 1.7 * t + (4 * Math.PI / D_px) * (x - lx));
        waveOffset = waveAmp * (w1 + 0.35 * w2);
    }

    const u = (x - cx) / (D_px / 2);
    const y_surf = Math.max(y_liquid - 10, y_liquid + vortexDepth * (0.5 - u * u) + waveOffset);

    const T_ref = heatSimTemp || config.liquidTempInit || 20;
    const T_local = getTempAtPoint(x, y, coords);
    const beta_expand = 2e-4;
    const deltaT_buoy = T_local - T_ref;
    const buoyancyVy = -Math.max(-1.0, Math.min(1.0, 0.03 * beta_expand * deltaT_buoy * (config.g || 9.806) * scale));

    // 水面近傍の温水外向き流
    let surfaceWarmVx = 0;
    if (y < y_liquid + D_px * 0.12 && T_local > T_ref) {
        const warmFactor = Math.min(1, (T_local - T_ref) / 18);
        surfaceWarmVx = Math.sign(x - cx) * warmFactor * 0.6;
    }

    // --- 温度依存密度による流速連成（簡易） ---
    // 周囲の温度勾配に基づいて局所的な水平/鉛直補正速度を生成する。
    // 勾配は格子からの双差分で求め、小さな定数でスケーリングして px/frame 単位に変換する。
    let gradVx = 0, gradVy = 0;
    try {
        const dx_px = Math.max(1, Math.round(D_px * 0.02));
        const dy_px = dx_px;
        const T_xp = getTempAtPoint(x + dx_px, y, coords);
        const T_xm = getTempAtPoint(x - dx_px, y, coords);
        const T_yp = getTempAtPoint(x, y + dy_px, coords);
        const T_ym = getTempAtPoint(x, y - dy_px, coords);
        const dTdx_px = (T_xp - T_xm) / (2 * dx_px + 1e-9); // °C / px
        const dTdy_px = (T_yp - T_ym) / (2 * dy_px + 1e-9); // °C / px

        // 経験係数（表示速度への変換）
        const C_h = 0.45; // 水平方向の影響強度（調整可能）
        const C_v = 0.35; // 垂直方向の影響強度（調整可能）

        // 温度が高い方へ水平に広がる傾向を与える（符号調整）
        gradVx = -C_h * dTdx_px;
        gradVy = -C_v * dTdy_px;

        // クリップして極端な値を防ぐ（px/frame）
        const clip = v => Math.max(-2.0, Math.min(2.0, v));
        gradVx = clip(gradVx);
        gradVy = clip(gradVy);
    } catch (e) {
        // 安全にフォールバック（何もしない）
    }

    if (speed_rpm <= 5 || y < y_surf || y > getVesselBottomY(x, coords)) {
        return { vx: 0, vy: 0 };
    }

    const NqcMap = {
        'pitched-paddle': 1.6,
        'flat-paddle': 1.2,
        'flat-turbine': 1.4,
        'propeller': 2.0,
        'faudler': 1.3
    };
    const Nqc = NqcMap[config.impellerType] || 1.4;
    const n_rps = speed_rpm / 60;
    const DT_val = Math.max(0.01, config.DT);
    const d_val = config.d;
    const v_phys = (Nqc * n_rps * Math.pow(d_val, 3)) / Math.pow(DT_val, 2);
    const C_velocity = 0.00487;

    const submergedStageFraction = getSubmergedImpellerStageFraction(coords);
    if (submergedStageFraction <= 0) return { vx: 0, vy: 0 };

    const speedMagnitude = C_velocity * v_phys * scale * submergedStageFraction;

    const cavernDecay = getCavernDecay(x, y, coords);
    if (cavernDecay === 0) return { vx: 0, vy: 0 };

    let stages_y = getSubmergedImpellerStagePositions(coords);
    if (stages_y.length === 0) stages_y = getImpellerStagePositions(coords);

    const rxScale = relVortexX || 1.0;
    const ryScale = relVortexY || 1.0;
    const isRadial = (config.impellerType === 'flat-paddle' || config.impellerType === 'flat-turbine');
    const inLeft = x < cx;

    let totalVx = 0;
    let totalVy = 0;
    let totalWeight = 0;

    for (let si = 0; si < stages_y.length; si++) {
        const y_imp = stages_y[si];
        const y_upper_bound = si < stages_y.length - 1
            ? (stages_y[si] + stages_y[si + 1]) / 2 : y_surf;
        const y_lower_bound = si > 0
            ? (stages_y[si] + stages_y[si - 1]) / 2 : y_deepest;

        const zone_h = (y_lower_bound - y_upper_bound) || 1;
        const dist_to_stage_y = Math.abs(y - y_imp);
        const sigma = zone_h / 2;
        const weight = Math.exp(-(dist_to_stage_y * dist_to_stage_y) / (2 * sigma * sigma));
        if (weight < 0.001) continue;

        const inUpper = y < y_imp;
        let vx_dir = 0, vy_dir = 0;

        if (isRadial) {
            const h_upper = y_imp - y_upper_bound;
            const h_lower = y_lower_bound - y_imp;
            const vortexOffset = (D_px / 4) * rxScale;
            const vx_c = inLeft ? (lx + vortexOffset) : (rx - vortexOffset);
            const vy_c = inUpper
                ? (y_upper_bound + (h_upper / 2) * ryScale)
                : (y_imp + (h_lower / 2) * ryScale);
            const rx_v = x - vx_c;
            const ry_v = y - vy_c;
            const dist = Math.sqrt(rx_v * rx_v + ry_v * ry_v) || 1;

            if (inUpper) {
                vx_dir = inLeft ? (-ry_v / dist) : (ry_v / dist);
                vy_dir = inLeft ? (rx_v / dist) : (-rx_v / dist);
            } else {
                vx_dir = inLeft ? (ry_v / dist) : (-ry_v / dist);
                vy_dir = inLeft ? (-rx_v / dist) : (rx_v / dist);
            }

            const wallDist = Math.min(x - lx, rx - x, y - y_surf, getVesselBottomY(x, coords) - y);
            const wallThresh = D_px * 0.04;
            const wallFactor = Math.max(0.3, Math.min(1.0, wallDist / wallThresh));
            const centerThresh = D_px * 0.035;
            const centerFactor = Math.min(1.0, dist / centerThresh);

            totalVx += vx_dir * speedMagnitude * wallFactor * centerFactor * weight;
            totalVy += vy_dir * speedMagnitude * wallFactor * centerFactor * weight;
        } else {
            const h_zone = y_lower_bound - y_upper_bound;
            const vy_c = y_upper_bound + (h_zone / 2) * ryScale;
            const vortexOffset = (D_px / 4) * rxScale;
            const vx_c = inLeft ? (lx + vortexOffset) : (rx - vortexOffset);
            const rx_v = x - vx_c;
            const ry_v = y - vy_c;
            const dist = Math.sqrt(rx_v * rx_v + ry_v * ry_v) || 1;

            vx_dir = inLeft ? (-ry_v / dist) : (ry_v / dist);
            vy_dir = inLeft ? (rx_v / dist) : (-rx_v / dist);

            const wallDist = Math.min(x - lx, rx - x, y - y_surf, getVesselBottomY(x, coords) - y);
            const wallThresh = D_px * 0.04;
            const wallFactor = Math.max(0.3, Math.min(1.0, wallDist / wallThresh));
            const centerThresh = D_px * 0.05;
            const centerFactor = Math.min(1.0, dist / centerThresh);

            totalVx += vx_dir * speedMagnitude * wallFactor * centerFactor * weight;
            totalVy += vy_dir * speedMagnitude * wallFactor * centerFactor * weight;
        }

        totalWeight += weight;
    }

    if (totalWeight < 0.001) return { vx: 0, vy: 0 };
    const normFactor = Math.min(1.5, totalWeight) / totalWeight;
    return {
        vx: totalVx * normFactor * cavernDecay + surfaceWarmVx + (typeof gradVx !== 'undefined' ? gradVx : 0),
        vy: (totalVy * normFactor + buoyancyVy) * cavernDecay + (typeof gradVy !== 'undefined' ? gradVy : 0)
    };
}

// ── 3D Blade描画ヘルパー（既存ロジック保持） ───────────────
function getBladePointsAndDepth(phi, r_in, r_out, b_px, impellerType, cx, y_imp) {
    const N = 8;
    const points = [];

    let pitchAngle = 0;
    if (impellerType === 'pitched-paddle') {
        pitchAngle = Math.PI / 4;
    } else if (impellerType === 'propeller') {
        pitchAngle = Math.PI / 6;
    }

    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const r = r_in + t * (r_out - r_in);
        let w = b_px;
        if (impellerType === 'propeller') {
            w = b_px * Math.sin(Math.PI * t);
        } else if (impellerType === 'faudler') {
            w = b_px * (1.0 - 0.4 * t);
        }
        let localPhi = phi;
        if (impellerType === 'faudler') localPhi = phi - 0.45 * t;
        const chi = -w / 2;
        const x3d = r * Math.cos(localPhi) - chi * Math.sin(pitchAngle) * Math.sin(localPhi);
        const y3d = chi * Math.cos(pitchAngle);
        const z3d = r * Math.sin(localPhi) + chi * Math.sin(pitchAngle) * Math.cos(localPhi);
        points.push({ x: cx + x3d, y: y_imp + y3d, z: z3d });
    }

    for (let i = N; i >= 0; i--) {
        const t = i / N;
        const r = r_in + t * (r_out - r_in);
        let w = b_px;
        if (impellerType === 'propeller') {
            w = b_px * Math.sin(Math.PI * t);
        } else if (impellerType === 'faudler') {
            w = b_px * (1.0 - 0.4 * t);
        }
        let localPhi = phi;
        if (impellerType === 'faudler') localPhi = phi - 0.45 * t;
        const chi = w / 2;
        const x3d = r * Math.cos(localPhi) - chi * Math.sin(pitchAngle) * Math.sin(localPhi);
        const y3d = chi * Math.cos(pitchAngle);
        const z3d = r * Math.sin(localPhi) + chi * Math.sin(pitchAngle) * Math.cos(localPhi);
        points.push({ x: cx + x3d, y: y_imp + y3d, z: z3d });
    }

    let sumZ = 0;
    points.forEach(pt => sumZ += pt.z);
    return { points, avgZ: sumZ / points.length };
}

// ── LPT 粒子シミュレーション 初期化 ──────────────────────────
function initParticleSimulation() {
    simCanvas = document.getElementById('particleSimCanvas');
    if (!simCanvas) return;
    simCtx = simCanvas.getContext('2d');

    if (simAnimId) {
        cancelAnimationFrame(simAnimId);
        simAnimId = null;
    }
    simImpellerAngle = 0;
    simLastFrameTime = null;
    _cachedNjsResult = calculateNjs();

    const coords = getVesselVisualCoords(simCanvas.width, simCanvas.height);
    const { lx, D_px, cx, scale, hb, y_deepest, y_cyl, y_liquid, rx } = coords;

    // 格子温度場初期化（液初期温度 または バルク液温で）
    const T0 = (typeof heatSimTemp !== 'undefined' && heatSimTemp > 0) ? heatSimTemp : (config.liquidTempInit ?? 20);
    initTempGrid(T0);

    const targetCount = Math.min(3000, Math.max(200,
        Math.round(400 + 1000 * Math.log10(1 + 9 * (config.solidConcVal || 1.0)))));
    simParticles = [];

    const clearance_px = config.clearance * scale;
    const b_px = config.b * scale;
    let stages_y = getSubmergedImpellerStagePositions(coords);
    if (stages_y.length === 0) stages_y = getImpellerStagePositions(coords);

    const rImp_px = (config.d * scale) / 2;

    for (let i = 0; i < targetCount; i++) {
        let px, py;
        const mode = config.particleStartMode || 'near-impeller';
        if (mode === 'near-impeller') {
            const sy = stages_y[Math.floor(Math.random() * stages_y.length)];
            const ang = Math.random() * Math.PI * 2;
            const r = rImp_px * (0.25 + Math.random() * 0.6);
            px = cx + r * Math.cos(ang);
            py = sy + (Math.random() - 0.5) * (b_px * 0.9);
            px = Math.max(lx + 2, Math.min(rx - 2, px));
            py = Math.max(y_liquid + 2, Math.min(getVesselBottomY(px, coords) - 1, py));
        } else if (mode === 'suspended') {
            px = lx + Math.random() * D_px;
            const availableDepth = Math.max(4, getVesselBottomY(px, coords) - y_liquid - 4);
            const surfaceBand = Math.min(30, Math.max(8, Math.min(Math.floor(b_px || 8), availableDepth)));
            py = y_liquid + 2 + Math.random() * surfaceBand;
        } else if (mode === 'settled') {
            px = lx + Math.random() * D_px;
            py = getVesselBottomY(px, coords) - 2 - Math.random() * 8;
        } else {
            px = lx + Math.random() * D_px;
            const top = y_liquid + 2;
            const bottom = getVesselBottomY(px, coords) - 2;
            py = top + Math.random() * Math.max(1, bottom - top);
        }

        simParticles.push({
            x: px, y: py,
            vx: 0, vy: 0,
            // OU乱流状態
            wx: 0, wy: 0,
            relSize: 0.6 + Math.random() * 0.8,
            relVortexX: 0.75 + Math.random() * 0.5,
            relVortexY: 0.75 + Math.random() * 0.5,
            radius: 1.5,
            color: (config.particleStartMode === 'settled') ? '#78350f' : '#f1c27d'
        });
    }

    function loop() {
        drawParticleSimulation();
        simAnimId = requestAnimationFrame(loop);
    }
    loop();
}

// ── LPT 粒子描画・物理更新 ────────────────────────────────────
function drawParticleSimulation() {
    if (!simCanvas || !simCtx) return;

    const coords = getVesselVisualCoords(simCanvas.width, simCanvas.height);
    const { cx, D_px, scale, hb, y_deepest, y_cyl, y_liquid, y_top, lx, rx } = coords;

    if (document.hidden) { simLastFrameTime = null; return; }
    simCtx.clearRect(0, 0, simCanvas.width, simCanvas.height);

    const rpm = config.simSpeed || 0;
    let vortexDepth = Math.pow(rpm / 600, 2) * D_px * 0.05;
    if (config.baffleActive) vortexDepth *= 0.12;
    const maxAllowedDepth = Math.max(0, (y_deepest - y_liquid) * 0.6);
    vortexDepth = Math.min(vortexDepth, maxAllowedDepth);

    const t_anim = performance.now() / 1000;
    const waveAmp = (rpm / 600) * (config.baffleActive ? 0.7 : 2.2);
    const waveFreq = 2.0 + (rpm / 300) * 5.0;

    const getLocalSurfaceY = (x_val) => {
        const u = (x_val - cx) / (D_px / 2);
        let waveOffset = 0;
        if (rpm > 5) {
            const w1 = Math.sin(waveFreq * t_anim - (2 * Math.PI / D_px) * (x_val - lx));
            const w2 = Math.cos(waveFreq * 1.7 * t_anim + (4 * Math.PI / D_px) * (x_val - lx));
            waveOffset = waveAmp * (w1 + 0.35 * w2);
        }
        const y_surf = y_liquid + vortexDepth * (0.5 - u * u) + waveOffset;
        return Math.max(y_liquid - 10, y_surf);
    };

    // 1. 液体領域の塗りつぶし
    simCtx.save();
    simCtx.fillStyle = 'rgba(6, 182, 212, 0.05)';
    simCtx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = lx + t * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) simCtx.moveTo(px, py);
        else simCtx.lineTo(px, py);
    }
    simCtx.lineTo(rx, y_cyl);
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        simCtx.ellipse(cx, y_cyl, D_px / 2, hb, 0, 0, Math.PI, false);
    } else if (config.headType === 'hemispherical') {
        simCtx.arc(cx, y_cyl, D_px / 2, 0, Math.PI, false);
    } else {
        simCtx.lineTo(lx, y_cyl);
    }
    simCtx.closePath();
    simCtx.fill();

    // 液面ライン
    simCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    simCtx.lineWidth = 2;
    simCtx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = lx + t * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) simCtx.moveTo(px, py);
        else simCtx.lineTo(px, py);
    }
    simCtx.stroke();
    simCtx.restore();

    // 2. バッフル
    if (config.baffleActive) {
        simCtx.save();
        simCtx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        simCtx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        simCtx.lineWidth = 1;
        const bw_px = Math.max(4, config.Bw * scale);
        const y_surf_wall = getLocalSurfaceY(lx);
        const baffle_h = y_cyl - y_surf_wall;
        simCtx.fillRect(lx, y_surf_wall, bw_px, baffle_h);
        simCtx.strokeRect(lx, y_surf_wall, bw_px, baffle_h);
        if (config.nB > 1) {
            simCtx.fillRect(rx - bw_px, y_surf_wall, bw_px, baffle_h);
            simCtx.strokeRect(rx - bw_px, y_surf_wall, bw_px, baffle_h);
        }
        simCtx.restore();
    }

    // 2.5 キャバーン（降伏応力流体）
    if (config.cavern_Dc > 0) {
        simCtx.save();
        const cavernRadius = (config.cavern_Dc / 2) * scale;
        const clearance_px2 = config.clearance * scale;
        const b_px2 = config.b * scale;
        const y_imp2 = y_deepest - clearance_px2 - b_px2 / 2;

        simCtx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        simCtx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = lx + t * D_px;
            const py = getLocalSurfaceY(px);
            if (i === 0) simCtx.moveTo(px, py);
            else simCtx.lineTo(px, py);
        }
        simCtx.lineTo(rx, y_cyl);
        if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
            simCtx.ellipse(cx, y_cyl, D_px / 2, hb, 0, 0, Math.PI, false);
        } else if (config.headType === 'hemispherical') {
            simCtx.arc(cx, y_cyl, D_px / 2, 0, Math.PI, false);
        } else {
            simCtx.lineTo(lx, y_cyl);
        }
        simCtx.closePath();
        simCtx.fill();

        simCtx.globalCompositeOperation = 'destination-out';
        simCtx.filter = 'blur(32px)';
        if (config.cavernModel === 'cylindrical') {
            simCtx.save();
            simCtx.translate(cx, y_imp2);
            simCtx.scale(1, 1.4);
            const grad = simCtx.createRadialGradient(0, 0, cavernRadius * 0.2, 0, 0, cavernRadius * 1.2);
            grad.addColorStop(0, 'rgba(255,255,255,1.0)');
            grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
            grad.addColorStop(1, 'rgba(255,255,255,0.0)');
            simCtx.fillStyle = grad;
            simCtx.beginPath();
            simCtx.arc(0, 0, cavernRadius * 1.2, 0, 2 * Math.PI);
            simCtx.fill();
            simCtx.restore();
        } else {
            const grad = simCtx.createRadialGradient(cx, y_imp2, cavernRadius * 0.2, cx, y_imp2, cavernRadius * 1.2);
            grad.addColorStop(0, 'rgba(255,255,255,1.0)');
            grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
            grad.addColorStop(1, 'rgba(255,255,255,0.0)');
            simCtx.fillStyle = grad;
            simCtx.beginPath();
            simCtx.arc(cx, y_imp2, cavernRadius * 1.2, 0, 2 * Math.PI);
            simCtx.fill();
        }
        simCtx.filter = 'none';
        simCtx.globalCompositeOperation = 'source-over';

        simCtx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        simCtx.font = '10px sans-serif';
        simCtx.fillText('流動領域', cx + cavernRadius + 10, y_imp2 - 5);
        simCtx.fillStyle = 'rgba(148, 163, 184, 0.9)';
        simCtx.fillText('死水域 (Dead Zone)', lx + 10, y_liquid + 20);
        simCtx.restore();
    }

    // コイル座標キャッシュ更新
    simCoilPositions = [];
    if (config.coilActive) {
        const d_co_m = config.coilOuterDia ?? 0.010;
        const D_c_real = (config.coilCenterDia && config.coilCenterDia > 0)
            ? config.coilCenterDia : 0.7 * config.DT;
        const D_c_px = D_c_real * scale;
        const coilR = Math.max(4, (d_co_m / 2) * scale);
        const y_bot_vessel = getVesselBottomY(cx + D_c_px / 2 + coilR, coords);
        const coilSpan = y_bot_vessel - coilR - y_liquid - 20;
        const p_c_m = Math.max(d_co_m * 1.01, config.coilPitch ?? (2.5 * d_co_m));
        const p_c_px = p_c_m * scale;
        const N_t = Math.max(1, Math.floor(coilSpan / p_c_px));
        const pitch = coilSpan / N_t;
        for (let j = 0; j < N_t; j++) {
            const cy_coil = y_liquid + 14 + j * pitch + pitch / 2;
            const cy_mid = cy_coil + pitch / 2;
            simCoilPositions.push({ x: cx - D_c_px / 2, y: cy_mid, r: coilR });
            simCoilPositions.push({ x: cx + D_c_px / 2, y: cy_coil, r: coilR });
        }
    }

    // 粒子数の動的調整
    const targetCount = Math.min(3000, Math.max(200,
        Math.round(400 + 1000 * Math.log10(1 + 9 * (config.solidConcVal || 1.0)))));
    if (simParticles.length < targetCount) {
        const toAdd = targetCount - simParticles.length;
        for (let i = 0; i < toAdd; i++) {
            const px = lx + Math.random() * D_px;
            const py = getVesselBottomY(px, coords) - 2 - Math.random() * 8;
            simParticles.push({
                x: px, y: py, vx: 0, vy: 0, wx: 0, wy: 0,
                relSize: 0.6 + Math.random() * 0.8,
                relVortexX: 0.75 + Math.random() * 0.5,
                relVortexY: 0.75 + Math.random() * 0.5,
                radius: 1.5, color: '#78350f'
            });
        }
    } else if (simParticles.length > targetCount) {
        simParticles.length = targetCount;
    }

    // ── 格子温度場の更新 ──
    // アニメーションフレーム時間差 dt を使って物理時間相当の dt_sim を算出
    const nowPerfNow = performance.now();
    const dt_frame_s = simLastFrameTime !== null
        ? Math.min((nowPerfNow - simLastFrameTime) / 1000, 0.05) : 0.016;
    // 格子更新: 実時間1秒 ≈ シミュレーション速度に応じたスケールファクター
    const dt_sim_grid = dt_frame_s * 60.0; // 適度に加速（見た目の応答性のため）
    updateTempGrid(coords, dt_sim_grid);

    // ── LPT: 粒子物理 ──────────────────────────────────────
    const njsResult = _cachedNjsResult;
    const njs_rpm = njsResult.error ? 1000 : njsResult.Njs_rpm;
    const liftOffThreshold = 0.15 * njs_rpm;
    const baseRadius = Math.max(0.8, Math.min(6.0, 0.5 + 0.1 * Math.sqrt(config.dp_um || 150)));

    // OU ノイズパラメータの計算
    // Lagrangian 積分時間スケール τ_L ≈ (1.1 * L_int) / u_rms
    // L_int ≈ 0.1 * d (インペラ径), u_rms ≈ 0.1 * v_tip = 0.1 * π * d * N
    const n_rps_ou = (config.simSpeed ?? 300) / 60;
    const d_ou = config.d ?? 0.06;
    const v_tip_phys = Math.PI * d_ou * n_rps_ou;   // [m/s]
    const L_int_phys = 0.1 * d_ou;                   // [m]
    const u_rms_phys = 0.08 * v_tip_phys;            // [m/s]
    const tau_L_phys = (u_rms_phys > 1e-6) ? (1.1 * L_int_phys / u_rms_phys) : 1.0; // [s]
    // px 換算: sigma_px = u_rms [m/s] * scale [px/m] * C_velocity
    const m_per_px_ou = (config.DT ?? 0.105) / (coords.D_px);
    const u_rms_px = 0.00487 * u_rms_phys * (1 / m_per_px_ou); // [px/frame相当]
    const theta_ou = 1.0 / Math.max(1e-3, tau_L_phys);         // [1/s]
    // σ²=2 u'^2 θ → σ = sqrt(2) * u_rms * sqrt(θ)
    const sigma_ou = Math.sqrt(2) * u_rms_px * Math.sqrt(theta_ou);

    simCtx.save();
    simParticles.forEach(p => {
        if (!p.relSize) p.relSize = 0.6 + Math.random() * 0.8;
        p.radius = baseRadius * p.relSize;

        // ── OU 乱流更新 ──
        const ouResult = ouStep(p.wx || 0, p.wy || 0, theta_ou, sigma_ou, dt_frame_s);
        p.wx = ouResult.wx;
        p.wy = ouResult.wy;

        // ── 平均流速 ──
        const meanFlow = getMeanFlowVelocity(p.x, p.y, config.simSpeed, coords, p.relVortexX, p.relVortexY);

        // ── Stokes 終端沈降速度 [px/frame] ──
        const dp_m = Math.max(0.1, config.dp_um || 150) * 1e-6;
        const R_p = dp_m * 0.5;
        const mu_f = Math.max(0.001, config.mu || 0.001);
        const g_acc = config.g || 9.806;
        const rhoS = config.rho_S ?? 2500;
        const rhoL = config.rho ?? 998;
        const T_local = getTempAtPoint(p.x, p.y, coords);
        const T_ref = heatSimTemp;
        const beta_expand = 2e-4;
        const deltaT = T_local - T_ref;
        const rhoL_local = rhoL * (1 - beta_expand * deltaT);
        const delta_rho_total = rhoS - rhoL_local;  // 正→沈降、負→浮上
        const vt_total_m_s = (2 / 9) * (delta_rho_total * g_acc * R_p * R_p) / mu_f;  // [m/s]
        const vt_total_px = Math.max(-8, Math.min(8, 0.00487 * vt_total_m_s * (1 / m_per_px_ou)));

        // ── LPT 速度統合 ──
        // 目標速度 = 平均流 + OU乱流 + 体積力に基づく沈降/浮上
        const target_vx = meanFlow.vx + p.wx;
        const target_vy = meanFlow.vy + p.wy + vt_total_px;

        // Stokes 追従係数（粒子の慣性時間スケールに依存）
        // τ_p = ρ_p * d_p² / (18 μ_f) [s]
        const tau_p = Math.max(1e-6, rhoS * dp_m * dp_m / (18 * mu_f));  // [s]
        const stokesRelax = Math.min(0.95, Math.max(0.02, dt_frame_s / (tau_p + dt_frame_s)));

        p.vx += (target_vx - p.vx) * stokesRelax;
        p.vy += (target_vy - p.vy) * stokesRelax;

        // 座標更新
        p.x += p.vx;
        p.y += p.vy;

        // NaN/Inf ガード
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
            p.x = cx + (Math.random() - 0.5) * coords.D_px * 0.5;
            p.y = y_liquid + 5 + Math.random() * (y_deepest - y_liquid - 10);
            p.vx = 0; p.vy = 0; p.wx = 0; p.wy = 0;
        }

        // ── 壁境界条件 ──
        if (p.x < lx + p.radius) { p.x = lx + p.radius; p.vx = -p.vx * 0.2; }
        if (p.x > rx - p.radius) { p.x = rx - p.radius; p.vx = -p.vx * 0.2; }

        const y_surf_p = getSharedSurfaceY(p.x, coords, rpm, t_anim);
        if (p.y < y_surf_p + p.radius) {
            p.y = y_surf_p + p.radius;
            p.vy = Math.abs(p.vy) * 0.1;
        }

        // コイル衝突
        if (config.coilActive && simCoilPositions.length > 0) {
            simCoilPositions.forEach(c => {
                const dx = p.x - c.x, dy = p.y - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = c.r + p.radius;
                if (dist < minDist && dist > 0.01) {
                    const nx = dx / dist, ny = dy / dist;
                    p.x = c.x + nx * minDist;
                    p.y = c.y + ny * minDist;
                    const vDotN = p.vx * nx + p.vy * ny;
                    if (vDotN < 0) {
                        p.vx -= 1.4 * vDotN * nx;
                        p.vy -= 1.4 * vDotN * ny;
                        p.vx *= 0.5; p.vy *= 0.5;
                    }
                }
            });
        }

        const y_bot = getVesselBottomY(p.x, coords);
        if (p.y > y_bot - p.radius - 1) {
            p.y = y_bot - p.radius - 1;
            const isBuoyant = delta_rho_total < 0;
            if (!isBuoyant && config.simSpeed < liftOffThreshold) {
                p.vx = 0; p.vy = 0; p.wx = 0; p.wy = 0;
                p.color = '#78350f';
            } else if (isBuoyant) {
                p.vy = Math.min(p.vy, -Math.max(0.35, Math.abs(vt_total_px) * 3));
                p.vx *= 0.4;
                p.color = '#38bdf8';
            } else {
                p.vy = -Math.abs(p.vy) * 0.05;
                const sweepDir = (config.impellerType === 'pitched-paddle' || config.impellerType === 'propeller')
                    ? (p.x < cx ? -0.8 : 0.8) : (p.x < cx ? 0.8 : -0.8);
                p.vx += sweepDir * 0.12 * (config.simSpeed / 300);
                p.color = '#b45309';
            }
        } else {
            if (config.simSpeed >= njs_rpm) {
                p.color = '#f59e0b';
            } else if (delta_rho < 0) {
                p.color = '#38bdf8';
            } else {
                p.color = '#d97706';
            }
        }

        // 粒子描画
        simCtx.fillStyle = p.color;
        simCtx.beginPath();
        simCtx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        simCtx.fill();
    });
    simCtx.restore();

    // コイル描画
    if (config.coilActive) {
        simCtx.save();
        const coilFill = 'rgba(6,182,212,1.0)';
        const coilStroke = 'rgba(2,120,150,1.0)';
        const coilFillBack = 'rgba(4,140,160,1.0)';
        const d_co_m = config.coilOuterDia ?? 0.010;
        const D_c_real = (config.coilCenterDia && config.coilCenterDia > 0)
            ? config.coilCenterDia : 0.7 * config.DT;
        const D_c_px = D_c_real * scale;
        const coilR = Math.max(4, (d_co_m / 2) * scale);
        const y_bot_vessel = getVesselBottomY(cx + D_c_px / 2 + coilR, coords);
        const coilSpan = y_bot_vessel - coilR - y_liquid - 20;
        const p_c_m = Math.max(d_co_m * 1.01, config.coilPitch ?? (2.5 * d_co_m));
        const p_c_px = p_c_m * scale;
        const N_t = Math.max(1, Math.floor(coilSpan / p_c_px));
        const pitch = coilSpan / N_t;

        for (let j = 0; j < N_t; j++) {
            const cy_coil = y_liquid + 14 + j * pitch + pitch / 2;
            const cy_mid = cy_coil + pitch / 2;
            // 左断面（後ろ）
            simCtx.beginPath(); simCtx.ellipse(cx - D_c_px / 2, cy_mid, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            simCtx.fillStyle = coilFillBack; simCtx.fill();
            simCtx.strokeStyle = coilStroke; simCtx.lineWidth = 1.5; simCtx.stroke();
            // 右断面（後ろ）
            simCtx.beginPath(); simCtx.ellipse(cx + D_c_px / 2, cy_coil, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            simCtx.fillStyle = coilFillBack; simCtx.fill(); simCtx.stroke();
            // 連結
            simCtx.beginPath(); simCtx.strokeStyle = coilFill; simCtx.lineWidth = coilR * 1.1; simCtx.lineCap = 'round';
            simCtx.moveTo(cx + D_c_px / 2, cy_coil);
            simCtx.bezierCurveTo(cx + D_c_px / 2 - coilR * 1.5, cy_coil + pitch * 0.15, cx - D_c_px / 2 + coilR * 1.5, cy_mid - pitch * 0.15, cx - D_c_px / 2, cy_mid);
            simCtx.stroke();
            simCtx.beginPath(); simCtx.strokeStyle = coilStroke; simCtx.lineWidth = 1; simCtx.lineCap = 'butt';
            simCtx.moveTo(cx + D_c_px / 2, cy_coil);
            simCtx.bezierCurveTo(cx + D_c_px / 2 - coilR * 1.5, cy_coil + pitch * 0.15, cx - D_c_px / 2 + coilR * 1.5, cy_mid - pitch * 0.15, cx - D_c_px / 2, cy_mid);
            simCtx.stroke();
            // 前面断面
            simCtx.beginPath(); simCtx.ellipse(cx - D_c_px / 2, cy_mid, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            simCtx.fillStyle = coilFill; simCtx.fill();
            simCtx.strokeStyle = coilStroke; simCtx.lineWidth = 1.5; simCtx.stroke();
            simCtx.beginPath(); simCtx.ellipse(cx + D_c_px / 2, cy_coil, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            simCtx.fillStyle = coilFill; simCtx.fill(); simCtx.stroke();
            // ハイライト
            simCtx.beginPath(); simCtx.ellipse(cx - D_c_px / 2 - coilR * 0.15, cy_mid - coilR * 0.28, coilR * 0.18, coilR * 0.3, -0.3, 0, Math.PI * 2);
            simCtx.fillStyle = 'rgba(255,255,255,0.4)'; simCtx.fill();
            simCtx.beginPath(); simCtx.ellipse(cx + D_c_px / 2 - coilR * 0.15, cy_coil - coilR * 0.28, coilR * 0.18, coilR * 0.3, -0.3, 0, Math.PI * 2);
            simCtx.fill();
        }
        simCtx.restore();
    }

    // インペラ + シャフト（depth-sorted 3D描画）
    const clearance_px = config.clearance * scale;
    const b_px = config.b * scale;
    const y_bottom_impeller = y_deepest - clearance_px - b_px / 2;
    const d_px = config.d * scale;
    const r_hub = 5;
    const r_in = r_hub;
    const r_out = d_px / 2;

    const nowPerfMs2 = performance.now();
    if (simLastFrameTime !== null) {
        const dtSec = Math.min((nowPerfMs2 - simLastFrameTime) / 1000, 0.05);
        const omega = (config.simSpeed > 5) ? (config.simSpeed * Math.PI / 30) : 0;
        simImpellerAngle += omega * dtSec;
        simImpellerAngle = simImpellerAngle % (2 * Math.PI);
    }
    simLastFrameTime = nowPerfMs2;
    const angle = simImpellerAngle;

    const bladeCountMap = { 'flat-turbine': 6, 'pitched-paddle': 4, 'flat-paddle': 2, 'propeller': 3, 'faudler': 3 };
    const defaultBlades = bladeCountMap[config.impellerType] || 2;
    const nBlades = Math.max(1, Number.isFinite(config.np) ? config.np : defaultBlades);

    const stages_y = getImpellerStagePositions(coords);

    const drawElements = [];
    drawElements.push({
        avgZ: -0.1,
        draw: () => {
            simCtx.save();
            simCtx.strokeStyle = '#52525b'; simCtx.lineWidth = 4; simCtx.lineCap = 'round';
            simCtx.beginPath();
            simCtx.moveTo(cx, y_liquid - 15);
            simCtx.lineTo(cx, y_bottom_impeller + b_px / 2);
            simCtx.stroke();
            simCtx.restore();
        }
    });

    stages_y.forEach(y_imp => {
        if (config.impellerType === 'flat-turbine') {
            drawElements.push({
                avgZ: 0.01, draw: () => {
                    simCtx.save();
                    simCtx.fillStyle = '#a1a1aa'; simCtx.strokeStyle = '#52525b'; simCtx.lineWidth = 0.8;
                    simCtx.fillRect(cx - r_out * 0.7, y_imp - 1.5, r_out * 1.4, 3);
                    simCtx.strokeRect(cx - r_out * 0.7, y_imp - 1.5, r_out * 1.4, 3);
                    simCtx.restore();
                }
            });
        }

        drawElements.push({
            avgZ: 0.02, draw: () => {
                simCtx.save();
                simCtx.fillStyle = '#3f3f46'; simCtx.strokeStyle = '#27272a'; simCtx.lineWidth = 1;
                simCtx.beginPath(); simCtx.arc(cx, y_imp, r_hub, 0, Math.PI * 2); simCtx.fill(); simCtx.stroke();
                const markerRadius = 2.5;
                const markerAngle = angle;
                const mx = cx + Math.cos(markerAngle) * (r_hub - 3);
                const my = y_imp + Math.sin(markerAngle) * (r_hub - 3);
                simCtx.fillStyle = '#fde047';
                simCtx.beginPath(); simCtx.arc(mx, my, markerRadius, 0, Math.PI * 2); simCtx.fill();
                simCtx.strokeStyle = '#fde047'; simCtx.lineWidth = 2;
                simCtx.beginPath(); simCtx.moveTo(cx, y_imp); simCtx.lineTo(mx, my); simCtx.stroke();
                simCtx.beginPath(); simCtx.arc(cx, y_imp, r_hub - 1.5, markerAngle - 0.35, markerAngle + 0.35); simCtx.stroke();
                simCtx.restore();
            }
        });

        for (let k = 0; k < nBlades; k++) {
            const phi = angle + (k * 2 * Math.PI / nBlades);
            const { points, avgZ } = getBladePointsAndDepth(phi, r_in, r_out, b_px, config.impellerType, cx, y_imp);
            const brightness = 0.65 + 0.35 * ((avgZ / r_out) * 0.5 + 0.5);
            const baseH = 330;
            drawElements.push({
                avgZ, draw: () => {
                    simCtx.save();
                    simCtx.fillStyle = `hsl(${baseH},75%,${Math.round(50 * brightness)}%)`;
                    simCtx.strokeStyle = `hsl(${baseH},80%,${Math.round(38 * brightness)}%)`;
                    simCtx.lineWidth = 1.2;
                    simCtx.beginPath(); simCtx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) simCtx.lineTo(points[i].x, points[i].y);
                    simCtx.closePath(); simCtx.fill(); simCtx.stroke();
                    simCtx.restore();
                }
            });
        }
    });

    drawElements.sort((a, b) => a.avgZ - b.avgZ);
    drawElements.forEach(el => el.draw());

    simCtx.stroke();

    // シミュレーションパラメータバッジ
    simCtx.save();
    const n_sim = config.simSpeed / 60;
    const Re_sim = calculateReVal(n_sim);
    const { Np } = calculateNpCurve(Re_sim);
    const effRho = getEffectiveDensity();
    const d_badge = config.d || 0.060;
    const V_liq = calcLiquidVolumeForPv() || 0.001;
    const P_sim = Np * effRho * Math.pow(n_sim, 3) * Math.pow(d_badge, 5);
    const Pv_sim = P_sim / V_liq;

    const badgeTitle = 'シミュレーション値';
    const txtRe = `Re: ${Math.round(Re_sim).toLocaleString()}`;
    const txtNp = `Np: ${Np.toFixed(3)}`;
    const txtPv = `Pv: ${Pv_sim.toFixed(1)} W/m³`;

    simCtx.font = 'bold 9px Inter, Outfit, Noto Sans JP, sans-serif';
    const textWidths = [
        simCtx.measureText(badgeTitle).width,
        simCtx.measureText(txtRe).width,
        simCtx.measureText(txtNp).width,
        simCtx.measureText(txtPv).width
    ];
    const maxTextWidth = Math.max(...textWidths);
    const badgeW = maxTextWidth + 16;
    const badgeH = 50;
    const badgeX = simCanvas.width - badgeW - 10;
    const badgeY = 15;

    simCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    simCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    simCtx.lineWidth = 1;
    simCtx.beginPath();
    if (simCtx.roundRect) simCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    else simCtx.rect(badgeX, badgeY, badgeW, badgeH);
    simCtx.fill(); simCtx.stroke();

    simCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    simCtx.textBaseline = 'top'; simCtx.textAlign = 'left';
    simCtx.fillText(badgeTitle, badgeX + 8, badgeY + 6);
    simCtx.fillStyle = '#06b6d4';
    simCtx.fillText(txtRe, badgeX + 8, badgeY + 18);
    simCtx.fillText(txtNp, badgeX + 8, badgeY + 28);
    simCtx.fillText(txtPv, badgeX + 8, badgeY + 38);
    simCtx.restore();
    simCtx.restore();
}
function switchMainTab(tab) {
    config.activeTab = tab;
    saveCurrentState();

    const btnRushton = document.getElementById('tab-btn-rushton');
    const btnPartsim = document.getElementById('tab-btn-partsim');
    const btnHeatsim = document.getElementById('tab-btn-heatsim');

    const contentRushton = document.getElementById('tab-content-rushton');
    const contentPartsim = document.getElementById('tab-content-partsim');
    const contentHeatsim = document.getElementById('tab-content-heatsim');

    const controlsRushton = document.getElementById('rushton-controls');
    const controlsPartsim = document.getElementById('partsim-controls');

    if (!btnRushton || !btnPartsim || !btnHeatsim || !contentRushton || !contentPartsim || !contentHeatsim) return;

    // Reset all tab button styles
    [btnRushton, btnPartsim, btnHeatsim].forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderBottom = '2px solid transparent';
        btn.style.fontWeight = '500';
    });

    // Hide all tab contents
    contentRushton.style.display = 'none';
    contentPartsim.style.display = 'none';
    contentHeatsim.style.display = 'none';

    if (controlsRushton) controlsRushton.style.display = 'none';
    if (controlsPartsim) controlsPartsim.style.display = 'none';

    // Cancel animation loops to save CPU
    if (simAnimId) {
        cancelAnimationFrame(simAnimId);
        simAnimId = null;
    }
    if (heatSimAnimId) {
        cancelAnimationFrame(heatSimAnimId);
        heatSimAnimId = null;
    }

    if (tab === 'rushton') {
        btnRushton.classList.add('active');
        btnRushton.style.color = 'var(--accent-color)';
        btnRushton.style.borderBottom = '2px solid var(--accent-color)';
        btnRushton.style.fontWeight = '600';
        contentRushton.style.display = 'flex';
        if (controlsRushton) controlsRushton.style.display = 'flex';

        if (chart) {
            chart.resize();
            chart.update();
        }
    } else if (tab === 'partsim') {
        btnPartsim.classList.add('active');
        btnPartsim.style.color = 'var(--accent-color)';
        btnPartsim.style.borderBottom = '2px solid var(--accent-color)';
        btnPartsim.style.fontWeight = '600';
        contentPartsim.style.display = 'flex';
        if (controlsPartsim) controlsPartsim.style.display = 'block';

        initParticleSimulation();
    } else if (tab === 'heatsim') {
        btnHeatsim.classList.add('active');
        btnHeatsim.style.color = 'var(--accent-color)';
        btnHeatsim.style.borderBottom = '2px solid var(--accent-color)';
        btnHeatsim.style.fontWeight = '600';
        contentHeatsim.style.display = 'flex';

        initHeatSimulation();
    }
}

function switchInnerTab(tab) {
    const btnSusp = document.getElementById('inner-tab-btn-suspension');
    const btnFlow = document.getElementById('inner-tab-btn-flow');
    const contentSusp = document.getElementById('inner-tab-content-suspension');
    const contentFlow = document.getElementById('inner-tab-content-flow');

    if (!btnSusp || !btnFlow || !contentSusp || !contentFlow) return;

    if (tab === 'suspension') {
        btnSusp.classList.add('active');
        btnSusp.style.color = 'var(--accent-color)';
        btnSusp.style.borderBottom = '2px solid var(--accent-color)';
        btnSusp.style.fontWeight = '600';

        btnFlow.classList.remove('active');
        btnFlow.style.color = 'var(--text-secondary)';
        btnFlow.style.borderBottom = '2px solid transparent';
        btnFlow.style.fontWeight = '500';

        contentSusp.style.display = 'block';
        contentFlow.style.display = 'none';
    } else {
        btnFlow.classList.add('active');
        btnFlow.style.color = 'var(--accent-color)';
        btnFlow.style.borderBottom = '2px solid var(--accent-color)';
        btnFlow.style.fontWeight = '600';

        btnSusp.classList.remove('active');
        btnSusp.style.color = 'var(--text-secondary)';
        btnSusp.style.borderBottom = '2px solid transparent';
        btnSusp.style.fontWeight = '500';

        contentSusp.style.display = 'none';
        contentFlow.style.display = 'block';
    }
}

function initParticleSimulation() {
    simCanvas = document.getElementById('particleSimCanvas');
    if (!simCanvas) return;

    // キャンバスのサイズを親コンテナに合わせる（非表示→表示時のリサイズ対応）
    const canvasParent = simCanvas.parentElement;
    if (canvasParent) {
        const rect = canvasParent.getBoundingClientRect();
        simCanvas.width = Math.max(300, Math.floor(rect.width * 0.95));
        simCanvas.height = Math.max(250, Math.floor(rect.height * 0.7));
    } else {
        // フォールバック: 固定サイズ
        simCanvas.width = 450;
        simCanvas.height = 320;
    }

    simCtx = simCanvas.getContext('2d');

    if (simAnimId) {
        cancelAnimationFrame(simAnimId);
        simAnimId = null;
    }
    simImpellerAngle = 0;
    simLastFrameTime = null;
    _cachedNjsResult = calculateNjs(); // 初期化時にNjsをキャッシュ

    const coords = getVesselVisualCoords(simCanvas.width, simCanvas.height);
    const { lx, D_px, cx, scale, hb, y_deepest, y_cyl, y_liquid, rx } = coords;

    // Initialize target particles based on concentration and selected start mode
    const targetCount = Math.min(3000, Math.max(200, Math.round(400 + 1000 * Math.log10(1 + 9 * (config.solidConcVal || 1.0)))));
    simParticles = [];

    // Helper: compute impeller stages Y positions (pixels)
    let stages_y = getSubmergedImpellerStagePositions(coords);
    if (stages_y.length === 0) stages_y = getImpellerStagePositions(coords);
    const b_px = config.b * scale;

    const rImp_px = (config.d * scale) / 2;

    for (let i = 0; i < targetCount; i++) {
        let px, py;
        const mode = config.particleStartMode || 'near-impeller';
        if (mode === 'near-impeller') {
            // Place near a randomly chosen impeller stage within blade radius
            const sy = stages_y[Math.floor(Math.random() * stages_y.length)];
            const ang = Math.random() * Math.PI * 2;
            const r = rImp_px * (0.25 + Math.random() * 0.6);
            px = cx + r * Math.cos(ang);
            py = sy + (Math.random() - 0.5) * (b_px * 0.9);
            // Clamp inside vessel
            px = Math.max(lx + 2, Math.min(rx - 2, px));
            py = Math.max(y_liquid + 2, Math.min(getVesselBottomY(px, coords) - 1, py));
        } else if (mode === 'suspended') {
            // Prefer near the liquid surface (surface layer)
            px = lx + Math.random() * D_px;
            // Available depth from surface to bottom at this x
            const availableDepth = Math.max(4, getVesselBottomY(px, coords) - y_liquid - 4);
            // Surface band: at least 8px, at most 30px, but not deeper than availableDepth
            const surfaceBand = Math.min(30, Math.max(8, Math.min(Math.floor(b_px || 8), availableDepth)));
            py = y_liquid + 2 + Math.random() * surfaceBand;
        } else if (mode === 'settled') {
            // At bottom (settled)
            px = lx + Math.random() * D_px;
            py = getVesselBottomY(px, coords) - 2 - Math.random() * 8;
        } else { // uniform
            px = lx + Math.random() * D_px;
            const top = y_liquid + 2;
            const bottom = getVesselBottomY(px, coords) - 2;
            py = top + Math.random() * Math.max(1, bottom - top);
        }

        simParticles.push({
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            relSize: 0.6 + Math.random() * 0.8,
            relVortexX: 0.75 + Math.random() * 0.5,
            relVortexY: 0.75 + Math.random() * 0.5,
            radius: 1.5,
            color: (config.particleStartMode === 'settled') ? '#78350f' : '#f1c27d'
        });
    }

    function loop() {
        drawParticleSimulation();
        simAnimId = requestAnimationFrame(loop);
    }
    loop();
}

function getBladePointsAndDepth(phi, r_in, r_out, b_px, impellerType, cx, y_imp) {
    const N = 8;
    const points = [];

    // Determine pitch angle (tilt around radial axis)
    let pitchAngle = 0;
    if (impellerType === 'pitched-paddle') {
        pitchAngle = Math.PI / 4; // 45 degrees
    } else if (impellerType === 'propeller') {
        pitchAngle = Math.PI / 6; // 30 degrees
    }

    // 1. Calculate top edge points (from r_in to r_out)
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const r = r_in + t * (r_out - r_in);

        let w = b_px;
        if (impellerType === 'propeller') {
            w = b_px * Math.sin(Math.PI * t);
        } else if (impellerType === 'faudler') {
            // Faudler blades are slightly tapered
            w = b_px * (1.0 - 0.4 * t);
        }

        let localPhi = phi;
        if (impellerType === 'faudler') {
            localPhi = phi - 0.45 * t; // Curve backward
        }

        const chi = -w / 2;

        // 3D coordinates relative to (cx, y_imp, 0)
        const x3d = r * Math.cos(localPhi) - chi * Math.sin(pitchAngle) * Math.sin(localPhi);
        const y3d = chi * Math.cos(pitchAngle);
        const z3d = r * Math.sin(localPhi) + chi * Math.sin(pitchAngle) * Math.cos(localPhi);

        points.push({ x: cx + x3d, y: y_imp + y3d, z: z3d });
    }

    // 2. Calculate bottom edge points (from r_out back to r_in)
    for (let i = N; i >= 0; i--) {
        const t = i / N;
        const r = r_in + t * (r_out - r_in);

        let w = b_px;
        if (impellerType === 'propeller') {
            w = b_px * Math.sin(Math.PI * t);
        } else if (impellerType === 'faudler') {
            w = b_px * (1.0 - 0.4 * t);
        }

        let localPhi = phi;
        if (impellerType === 'faudler') {
            localPhi = phi - 0.45 * t;
        }

        const chi = w / 2;

        const x3d = r * Math.cos(localPhi) - chi * Math.sin(pitchAngle) * Math.sin(localPhi);
        const y3d = chi * Math.cos(pitchAngle);
        const z3d = r * Math.sin(localPhi) + chi * Math.sin(pitchAngle) * Math.cos(localPhi);

        points.push({ x: cx + x3d, y: y_imp + y3d, z: z3d });
    }

    // Average Z depth for sorting
    let sumZ = 0;
    points.forEach(pt => sumZ += pt.z);
    const avgZ = sumZ / points.length;

    return { points, avgZ };
}

function drawParticleSimulation() {
    if (!simCanvas || !simCtx) return;

    const coords = getVesselVisualCoords(simCanvas.width, simCanvas.height);
    const { cx, D_px, scale, hb, y_deepest, y_cyl, y_liquid, y_top, lx, rx } = coords;

    if (document.hidden) { simLastFrameTime = null; return; }
    simCtx.clearRect(0, 0, simCanvas.width, simCanvas.height);

    // Calculate local parabolic vortex surface height based on rotation speed
    const rpm = config.simSpeed || 0;
    let vortexDepth = Math.pow(rpm / 600, 2) * D_px * 0.05;
    if (config.baffleActive) {
        vortexDepth *= 0.12; // Baffled vortex is significantly suppressed
    }
    const maxAllowedDepth = Math.max(0, (y_deepest - y_liquid) * 0.6);
    vortexDepth = Math.min(vortexDepth, maxAllowedDepth);

    // Wave parameters
    const t = performance.now() / 1000;
    const waveAmp = (rpm / 600) * (config.baffleActive ? 0.7 : 2.2);
    const waveFreq = 2.0 + (rpm / 300) * 5.0;

    // Helper to get local surface Y coordinate at any X
    const getLocalSurfaceY = (x_val) => {
        const u = (x_val - cx) / (D_px / 2);
        let waveOffset = 0;
        if (rpm > 5) {
            const w1 = Math.sin(waveFreq * t - (2 * Math.PI / D_px) * (x_val - lx));
            const w2 = Math.cos(waveFreq * 1.7 * t + (4 * Math.PI / D_px) * (x_val - lx));
            waveOffset = waveAmp * (w1 + 0.35 * w2);
        }
        const y_surf = y_liquid + vortexDepth * (0.5 - u * u) + waveOffset;
        return Math.max(y_liquid - 10, y_surf);
    };

    // 1. Draw Liquid Region Fill
    simCtx.save();
    simCtx.fillStyle = 'rgba(6, 182, 212, 0.05)';
    simCtx.beginPath();

    // Draw curved top surface from left (lx) to right (rx)
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = lx + t * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) {
            simCtx.moveTo(px, py);
        } else {
            simCtx.lineTo(px, py);
        }
    }

    // Go down to bottom right cylindrical wall
    simCtx.lineTo(rx, y_cyl);

    // Trace the bottom vessel head from right to left
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        simCtx.ellipse(cx, y_cyl, D_px / 2, hb, 0, 0, Math.PI, false);
    } else if (config.headType === 'hemispherical') {
        simCtx.arc(cx, y_cyl, D_px / 2, 0, Math.PI, false);
    } else {
        simCtx.lineTo(lx, y_cyl);
    }
    simCtx.closePath();
    simCtx.fill();

    // Draw Liquid Surface Outline (parabolic curve)
    simCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; // Made more visible to match heat sim
    simCtx.lineWidth = 2;
    simCtx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = lx + t * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) {
            simCtx.moveTo(px, py);
        } else {
            simCtx.lineTo(px, py);
        }
    }
    simCtx.stroke();
    simCtx.restore();

    // 2. Draw Baffles (adaptive height to local liquid surface at walls)
    if (config.baffleActive) {
        simCtx.save();
        simCtx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        simCtx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        simCtx.lineWidth = 1;
        const bw_px = Math.max(4, config.Bw * scale);
        const y_surf_wall = getLocalSurfaceY(lx); // liquid level at the wall
        const baffle_h = y_cyl - y_surf_wall;

        simCtx.fillRect(lx, y_surf_wall, bw_px, baffle_h);
        simCtx.strokeRect(lx, y_surf_wall, bw_px, baffle_h);

        if (config.nB > 1) {
            simCtx.fillRect(rx - bw_px, y_surf_wall, bw_px, baffle_h);
            simCtx.strokeRect(rx - bw_px, y_surf_wall, bw_px, baffle_h);
        }
        simCtx.restore();
    }

    // 2.5 Draw Dead Water Zone and Cavern (for Yield Stress Fluids, respects curved surface)
    if (config.cavern_Dc > 0) {
        simCtx.save();
        const cavernRadius = (config.cavern_Dc / 2) * scale;
        const clearance_px = config.clearance * scale;
        const b_px = config.b * scale;
        const y_imp = y_deepest - clearance_px - b_px / 2;

        // タンク全体を暗くして死水域を表現
        simCtx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        simCtx.beginPath();
        // Trace curved surface from left to right
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = lx + t * D_px;
            const py = getLocalSurfaceY(px);
            if (i === 0) {
                simCtx.moveTo(px, py);
            } else {
                simCtx.lineTo(px, py);
            }
        }
        simCtx.lineTo(rx, y_cyl);
        if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
            simCtx.ellipse(cx, y_cyl, D_px / 2, hb, 0, 0, Math.PI, false);
        } else if (config.headType === 'hemispherical') {
            simCtx.arc(cx, y_cyl, D_px / 2, 0, Math.PI, false);
        } else {
            simCtx.lineTo(lx, y_cyl);
        }
        simCtx.closePath();
        simCtx.fill();

        // キャバーン領域を「くり抜く」 (流動領域) - グラデーションとぼかしフィルターの両方を用いて境界を非常に曖昧にする
        simCtx.globalCompositeOperation = 'destination-out';

        // Use filter blur (if supported) for extra softness
        simCtx.filter = 'blur(32px)';

        if (config.cavernModel === 'cylindrical') {
            // 円筒モデル: 縦横比を調整した楕円グラデーションでくり抜く
            simCtx.save();
            simCtx.translate(cx, y_imp);
            simCtx.scale(1, 1.4); // 縦に少し伸ばして円筒形状に近似
            const grad = simCtx.createRadialGradient(0, 0, cavernRadius * 0.2, 0, 0, cavernRadius * 1.2);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
            grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
            simCtx.fillStyle = grad;
            simCtx.beginPath();
            simCtx.arc(0, 0, cavernRadius * 1.2, 0, 2 * Math.PI);
            simCtx.fill();
            simCtx.restore();
        } else {
            // 球形モデル: 円形グラデーションでくり抜く
            const grad = simCtx.createRadialGradient(cx, y_imp, cavernRadius * 0.2, cx, y_imp, cavernRadius * 1.2);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
            grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
            simCtx.fillStyle = grad;
            simCtx.beginPath();
            simCtx.arc(cx, y_imp, cavernRadius * 1.2, 0, 2 * Math.PI);
            simCtx.fill();
        }

        simCtx.filter = 'none';

        // 通常の描画モードに戻す
        simCtx.globalCompositeOperation = 'source-over';

        // ラベル描画
        simCtx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        simCtx.font = '10px sans-serif';
        simCtx.fillText('流動領域', cx + cavernRadius + 10, y_imp - 5);

        simCtx.fillStyle = 'rgba(148, 163, 184, 0.9)';
        simCtx.fillText('死水域 (Dead Zone)', lx + 10, y_liquid + 20);
        simCtx.restore();
    }

    // Update simCoilPositions for collision
    simCoilPositions = [];
    if (config.coilActive) {
        const d_co_m = config.coilOuterDia ?? 0.010;
        const D_c_real = (config.coilCenterDia && config.coilCenterDia > 0)
            ? config.coilCenterDia : 0.7 * config.DT;
        const D_c_px = D_c_real * scale;
        const coilR = Math.max(4, (d_co_m / 2) * scale);

        // Use the outer edge of the coil (cx + D_c_px/2 + coilR) to determine the deepest point it can go
        // without protruding into the curved bottom head.
        const y_bot_vessel = getVesselBottomY(cx + D_c_px / 2 + coilR, coords);
        const coilSpan = y_bot_vessel - coilR - y_liquid - 20;
        const p_c_m = Math.max(d_co_m * 1.01, config.coilPitch ?? (2.5 * d_co_m));
        const p_c_px = p_c_m * scale;
        const N_t = Math.max(1, Math.floor(coilSpan / p_c_px));
        const pitch = coilSpan / N_t;

        for (let j = 0; j < N_t; j++) {
            const cy_coil = y_liquid + 14 + j * pitch + pitch / 2;
            const cy_mid = cy_coil + pitch / 2;
            simCoilPositions.push({ x: cx - D_c_px / 2, y: cy_mid, r: coilR });
            simCoilPositions.push({ x: cx + D_c_px / 2, y: cy_coil, r: coilR });
        }
    }
    // Adjust particle count dynamically based on concentration
    const targetCount = Math.min(3000, Math.max(200, Math.round(400 + 1000 * Math.log10(1 + 9 * (config.solidConcVal || 1.0)))));
    if (simParticles.length < targetCount) {
        const toAdd = targetCount - simParticles.length;
        for (let i = 0; i < toAdd; i++) {
            const px = lx + Math.random() * D_px;
            const py = getVesselBottomY(px, coords) - 2 - Math.random() * 8;
            simParticles.push({
                x: px,
                y: py,
                vx: 0,
                vy: 0,
                relSize: 0.6 + Math.random() * 0.8,
                relVortexX: 0.75 + Math.random() * 0.5,
                relVortexY: 0.75 + Math.random() * 0.5,
                radius: 1.5,
                color: '#78350f'
            });
        }
    } else if (simParticles.length > targetCount) {
        simParticles.length = targetCount;
    }

    // 3. Draw Particles (under physics)
    const njsResult = _cachedNjsResult;
    const njs_rpm = njsResult.error ? 1000 : njsResult.Njs_rpm;
    const liftOffThreshold = 0.15 * njs_rpm;

    // Base radius scales with config.dp_um
    const baseRadius = Math.max(0.8, Math.min(6.0, 0.5 + 0.1 * Math.sqrt(config.dp_um || 150)));
    const collisionCellSize = Math.max(16, baseRadius * 2.4);
    const collisionGrid = new Map();
    const getGridKey = (gx, gy) => `${gx},${gy}`;

    simCtx.save();
    simParticles.forEach(p => {
        if (!p.relSize) {
            p.relSize = 0.6 + Math.random() * 0.8;
        }
        p.radius = baseRadius * p.relSize;

        const decay = getCavernDecay(p.x, p.y, coords);
        const fluidVel = getMeanFlowVelocity(p.x, p.y, config.simSpeed, coords, p.relVortexX, p.relVortexY);

        // Stokes 終端沈降速度 [m/s]
        const dp = Math.max(0.1, config.dp_um || 150);
        const dp_m = dp * 1e-6;
        const R = dp_m * 0.5;
        const mu_f = Math.max(0.001, config.mu || 0.001);
        const g_acc = config.g || 9.806;
        const delta_rho = config.rho_S - config.rho;
        const vt_m_s = (2 / 9) * (delta_rho * g_acc * R * R) / mu_f;

        // vt_px: speedMagnitude と同じ係数 C_velocity×scale を使うことで
        //  (1) 比率 speedMagnitude/vt_px = v_phys/vt_m_s がスケール不問で保たれる
        //  (2) 落下フレーム数 = H_px/vt_px = H/(C×vt_m_s) → 物理的沈降時間と正比例
        //      （スケール間で時間圧縮率が一定になる）
        const vt_px = Math.max(-5, Math.min(5, 0.00487 * vt_m_s * scale));

        // 粒子速度を流体速度＋Stokes沈降速度に向けて緩和
        const stokesRelax = Math.min(0.9, Math.max(0.02, 0.18 * Math.sqrt(150 / dp)));
        p.vx += (fluidVel.vx - p.vx) * stokesRelax;
        p.vy += (fluidVel.vy + vt_px - p.vy) * stokesRelax;

        // 乱流ゆらぎ（キャバーン境界のせん断層で乱流強度が極大化し、死水域深部でもわずかな微小拡散を残す）
        // decay が 0.5 付近（境界）で極大化する補正係数: 1.0 + 4.0 * decay * (1.0 - decay)
        const shearTurb = 1.0 + 4.0 * decay * (1.0 - decay);
        // 死水域深部（decay=0）でも完全停止せず、微小なブラウン運動的拡散（下限0.15）を残すことでスタックを防ぐ
        const turbFactor = Math.max(0.15, decay * shearTurb);
        // 乱流ゆらぎ幅: speedMagnitude と同じスケーリング（scale不要）
        const turb = 0.45 * (config.simSpeed / 300) * (p.relSize || 1.0) * turbFactor;
        p.vx += (Math.random() - 0.5) * turb;
        p.vy += (Math.random() - 0.5) * turb;

        // Update coordinates
        p.x += p.vx;
        p.y += p.vy;

        // Fail-safe check in case particle coordinates or velocities diverge to NaN or Infinity
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
            p.x = cx + (Math.random() - 0.5) * D_px * 0.5;
            p.y = y_liquid + 5 + Math.random() * (y_deepest - y_liquid - 10);
            p.vx = 0;
            p.vy = 0;
        }

        // Boundary collision with minimum velocity retention
        if (p.x < lx + p.radius) {
            p.x = lx + p.radius;
            p.vx = -p.vx * 0.2;
            // 壁での反弾後、最小の接線速度（上下）を保持（粘着防止）
            if (Math.abs(p.vy) < 0.2) p.vy = 0.2 * Math.sign(p.vy || 1);
        }
        if (p.x > rx - p.radius) {
            p.x = rx - p.radius;
            p.vx = -p.vx * 0.2;
            // 壁での反弾後、最小の接線速度（上下）を保持（粘着防止）
            if (Math.abs(p.vy) < 0.2) p.vy = 0.2 * Math.sign(p.vy || 1);
        }

        const t_sec = performance.now() / 1000;
        const rpm = config.simSpeedSync ? (expBlocks[0]?.rows[0]?.N || 300) : config.simSpeed;
        const y_surf = getSharedSurfaceY(p.x, coords, rpm, t_sec);
        if (p.y < y_surf + p.radius) {
            p.y = y_surf + p.radius;
            p.vy = Math.abs(p.vy) * 0.1;
            // 水面での衝突後、最小の水平速度を保持（粘着防止）
            if (Math.abs(p.vx) < 0.15) p.vx = 0.15 * Math.sign(p.vx || 1);
        }

        // コイルとの衝突判定（コイルON時）
        if (config.coilActive && simCoilPositions.length > 0) {
            simCoilPositions.forEach(c => {
                const dx = p.x - c.x;
                const dy = p.y - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = c.r + p.radius;
                if (dist < minDist && dist > 0.01) {
                    // 粒子をコイル外面へ押し出す
                    const nx = dx / dist;
                    const ny = dy / dist;
                    p.x = c.x + nx * minDist;
                    p.y = c.y + ny * minDist;
                    // 法線方向の速度成分を反転（減衰あり）
                    const vDotN = p.vx * nx + p.vy * ny;
                    if (vDotN < 0) {
                        p.vx -= 1.4 * vDotN * nx;
                        p.vy -= 1.4 * vDotN * ny;
                        p.vx *= 0.5;
                        p.vy *= 0.5;
                    }
                }
            });
        }

        const cellX = Math.floor(p.x / collisionCellSize);
        const cellY = Math.floor(p.y / collisionCellSize);
        for (let ix = cellX - 1; ix <= cellX + 1; ix++) {
            for (let iy = cellY - 1; iy <= cellY + 1; iy++) {
                const cell = collisionGrid.get(getGridKey(ix, iy));
                if (!cell) continue;
                cell.forEach(q => {
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = p.radius + q.radius;
                    if (dist <= 0 || dist >= minDist) return;

                    const overlap = minDist - dist;
                    const nx = dx / Math.max(dist, 1e-3);
                    const ny = dy / Math.max(dist, 1e-3);
                    const push = overlap * 0.5;

                    p.x += nx * push;
                    p.y += ny * push;
                    q.x -= nx * push;
                    q.y -= ny * push;

                    const relVel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
                    if (relVel < 0) {
                        const impulse = Math.min(0.6, -relVel * 0.65);
                        p.vx += impulse * nx;
                        p.vy += impulse * ny;
                        q.vx -= impulse * nx;
                        q.vy -= impulse * ny;
                    }

                    const tx = -ny;
                    const ty = nx;
                    const relT = (p.vx - q.vx) * tx + (p.vy - q.vy) * ty;
                    const friction = 0.15;
                    p.vx -= friction * relT * tx;
                    p.vy -= friction * relT * ty;
                    q.vx += friction * relT * tx;
                    q.vy += friction * relT * ty;
                });
            }
        }

        const gridKey = getGridKey(cellX, cellY);
        if (!collisionGrid.has(gridKey)) collisionGrid.set(gridKey, []);
        collisionGrid.get(gridKey).push(p);

        const y_bot = getVesselBottomY(p.x, coords);

        if (p.y > y_bot - p.radius - 1) {
            p.y = y_bot - p.radius - 1;
            const isBuoyant = delta_rho < 0;

            if (!isBuoyant && config.simSpeed < liftOffThreshold) {
                // Completely settled for heavy particles
                p.vx = 0;
                p.vy = 0;
                p.color = '#78350f'; // resting: dark amber
            } else if (isBuoyant) {
                // Light particles should detach and rise
                p.vy = Math.min(p.vy, -Math.max(0.35, Math.abs(vt_px) * 3));
                p.vx *= 0.4;
                p.color = '#38bdf8'; // buoyant: sky blue
            } else {
                // Rolling/bouncing at bottom
                p.vy = -Math.abs(p.vy) * 0.05;
                // 底面掃き: 小さな水平力（回転数比例）でインペラ流れ方向に粒子を動かす
                const sweepDir = (config.impellerType === 'pitched-paddle' || config.impellerType === 'propeller')
                    ? (p.x < cx ? -0.8 : 0.8)  // 軸流: 外向き
                    : (p.x < cx ? 0.8 : -0.8); // 半径流: 内向き
                p.vx += sweepDir * 0.12 * (config.simSpeed / 300);
                p.color = '#b45309'; // rolling: medium gold
            }
        } else {
            // Suspended
            if (config.simSpeed >= njs_rpm) {
                p.color = '#f59e0b'; // fully suspended: bright orange
            } else if (delta_rho < 0) {
                p.color = '#38bdf8'; // buoyant but not fully lifted yet
            } else {
                p.color = '#d97706'; // partially suspended: medium orange
            }
        }

        // Draw particle
        simCtx.fillStyle = p.color;
        simCtx.beginPath();
        simCtx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        simCtx.fill();
    });
    simCtx.restore();

    // --- コイル描画（半割表現） ---
    if (config.coilActive) {
        simCtx.save();
        const coilFill = 'rgba(6,182,212,1.0)';
        const coilStroke = 'rgba(2,120,150,1.0)';
        const coilFillBack = 'rgba(4,140,160,1.0)';

        const d_co_m = config.coilOuterDia ?? 0.010;
        const D_c_real = (config.coilCenterDia && config.coilCenterDia > 0)
            ? config.coilCenterDia : 0.7 * config.DT;
        const D_c_px = D_c_real * scale;
        const coilR = Math.max(4, (d_co_m / 2) * scale);

        // Use the outer edge of the coil for the bottom limit
        const y_bot_vessel = getVesselBottomY(cx + D_c_px / 2 + coilR, coords);
        const coilSpan = y_bot_vessel - coilR - y_liquid - 20;
        const p_c_m = Math.max(d_co_m * 1.01, config.coilPitch ?? (2.5 * d_co_m));
        const p_c_px = p_c_m * scale;
        const N_t = Math.max(1, Math.floor(coilSpan / p_c_px));
        const pitch = coilSpan / N_t;

        for (let j = 0; j < N_t; j++) {
            const cy_coil = y_liquid + 14 + j * pitch + pitch / 2;
            const cy_mid = cy_coil + pitch / 2;

            // 左側断面（後ろ側）
            simCtx.beginPath();
            simCtx.ellipse(cx - D_c_px / 2, cy_mid, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            simCtx.fillStyle = coilFillBack;
            simCtx.fill();
            simCtx.strokeStyle = coilStroke;
            simCtx.lineWidth = 1.5;
            simCtx.stroke();

            // 右側断面（後ろ側）
            simCtx.beginPath();
            simCtx.ellipse(cx + D_c_px / 2, cy_coil, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            simCtx.fillStyle = coilFillBack;
            simCtx.fill();
            simCtx.stroke();

            // 右→左の連結（上半分）
            simCtx.beginPath();
            simCtx.strokeStyle = coilFill;
            simCtx.lineWidth = coilR * 1.1;
            simCtx.lineCap = 'round';
            simCtx.moveTo(cx + D_c_px / 2, cy_coil);
            simCtx.bezierCurveTo(
                cx + D_c_px / 2 - coilR * 1.5, cy_coil + pitch * 0.15,
                cx - D_c_px / 2 + coilR * 1.5, cy_mid - pitch * 0.15,
                cx - D_c_px / 2, cy_mid
            );
            simCtx.stroke();

            // 連結弧の境界線
            simCtx.beginPath();
            simCtx.strokeStyle = coilStroke;
            simCtx.lineWidth = 1;
            simCtx.lineCap = 'butt';
            simCtx.moveTo(cx + D_c_px / 2, cy_coil);
            simCtx.bezierCurveTo(
                cx + D_c_px / 2 - coilR * 1.5, cy_coil + pitch * 0.15,
                cx - D_c_px / 2 + coilR * 1.5, cy_mid - pitch * 0.15,
                cx - D_c_px / 2, cy_mid
            );
            simCtx.stroke();

            // 前面断面（光沢ハイライト付き）
            simCtx.beginPath();
            simCtx.ellipse(cx - D_c_px / 2, cy_mid, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            simCtx.fillStyle = coilFill;
            simCtx.fill();
            simCtx.strokeStyle = coilStroke;
            simCtx.lineWidth = 1.5;
            simCtx.stroke();

            simCtx.beginPath();
            simCtx.ellipse(cx + D_c_px / 2, cy_coil, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            simCtx.fillStyle = coilFill;
            simCtx.fill();
            simCtx.stroke();

            // ハイライト
            simCtx.beginPath();
            simCtx.ellipse(cx - D_c_px / 2 - coilR * 0.15, cy_mid - coilR * 0.28, coilR * 0.18, coilR * 0.3, -0.3, 0, Math.PI * 2);
            simCtx.fillStyle = 'rgba(255,255,255,0.4)';
            simCtx.fill();

            simCtx.beginPath();
            simCtx.ellipse(cx + D_c_px / 2 - coilR * 0.15, cy_coil - coilR * 0.28, coilR * 0.18, coilR * 0.3, -0.3, 0, Math.PI * 2);
            simCtx.fill();
        }
        simCtx.restore();
    }

    // 4 & 5. Draw Shaft + Impeller Blades (3D rotating, depth-sorted)
    const clearance_px = config.clearance * scale;
    const b_px = config.b * scale;
    const y_bottom_impeller = y_deepest - clearance_px - b_px / 2;
    const d_px = config.d * scale;
    const r_hub = 5;
    const r_in = r_hub;
    const r_out = d_px / 2;

    // Calculate current rotation angle using delta-time accumulation
    // (avoids float precision loss from large Date.now() values)
    const nowPerfMs = performance.now();
    if (simLastFrameTime !== null) {
        const dtSec = Math.min((nowPerfMs - simLastFrameTime) / 1000, 0.05); // 上限50ms
        const omega = (config.simSpeed > 5) ? (config.simSpeed * Math.PI / 30) : 0;
        simImpellerAngle += omega * dtSec;
        // Keep angle in [0, 2π) to avoid unbounded growth
        simImpellerAngle = simImpellerAngle % (2 * Math.PI);
    }
    simLastFrameTime = nowPerfMs;
    const angle = simImpellerAngle;

    // Determine blade count per impeller type.
    // Allow the configured np to override default blade counts.
    const bladeCountMap = {
        'flat-turbine': 6,
        'pitched-paddle': 4,
        'flat-paddle': 2,
        'propeller': 3,
        'faudler': 3,
    };
    const defaultBlades = bladeCountMap[config.impellerType] || 2;
    const nBlades = Math.max(1, Number.isFinite(config.np) ? config.np : defaultBlades);

    const stages_y = getImpellerStagePositions(coords);

    // Build draw-element list for depth sorting
    const drawElements = [];

    // Shaft (drawn at Z = -0.1, i.e., behind everything except blades behind it)
    drawElements.push({
        avgZ: -0.1,
        draw: () => {
            simCtx.save();
            simCtx.strokeStyle = '#52525b';
            simCtx.lineWidth = 4;
            simCtx.lineCap = 'round';
            simCtx.beginPath();
            simCtx.moveTo(cx, y_top - 15);
            simCtx.lineTo(cx, y_bottom_impeller + b_px / 2);
            simCtx.stroke();
            simCtx.restore();
        }
    });

    stages_y.forEach(y_imp => {
        // --- Turbine disc (Rushton only) — drawn slightly in front of back blades ---
        if (config.impellerType === 'flat-turbine') {
            drawElements.push({
                avgZ: 0.01,
                draw: () => {
                    simCtx.save();
                    simCtx.fillStyle = '#a1a1aa';
                    simCtx.strokeStyle = '#52525b';
                    simCtx.lineWidth = 0.8;
                    simCtx.fillRect(cx - r_out * 0.7, y_imp - 1.5, r_out * 1.4, 3);
                    simCtx.strokeRect(cx - r_out * 0.7, y_imp - 1.5, r_out * 1.4, 3);
                    simCtx.restore();
                }
            });
        }

        // --- Hub at Z = 0 (slightly in front of disc) ---
        drawElements.push({
            avgZ: 0.02,
            draw: () => {
                simCtx.save();
                simCtx.fillStyle = '#3f3f46';
                simCtx.strokeStyle = '#27272a';
                simCtx.lineWidth = 1;
                simCtx.beginPath();
                simCtx.arc(cx, y_imp, r_hub, 0, Math.PI * 2);
                simCtx.fill();
                simCtx.stroke();

                // Non-symmetric hub marker to avoid strobing/aliasing at certain RPMs
                const markerRadius = 2.5;
                const markerAngle = angle * 1.0;
                const mx = cx + Math.cos(markerAngle) * (r_hub - 3);
                const my = y_imp + Math.sin(markerAngle) * (r_hub - 3);
                simCtx.fillStyle = '#fde047';
                simCtx.beginPath();
                simCtx.arc(mx, my, markerRadius, 0, Math.PI * 2);
                simCtx.fill();

                // Visible rotation pointer line
                simCtx.strokeStyle = '#fde047';
                simCtx.lineWidth = 2;
                simCtx.beginPath();
                simCtx.moveTo(cx, y_imp);
                simCtx.lineTo(mx, my);
                simCtx.stroke();

                // Add a short bright arc segment on the hub to further break symmetry
                simCtx.beginPath();
                simCtx.arc(cx, y_imp, r_hub - 1.5, markerAngle - 0.35, markerAngle + 0.35);
                simCtx.stroke();
                simCtx.restore();
            }
        });

        // --- Blades ---
        for (let k = 0; k < nBlades; k++) {
            const phi = angle + (k * 2 * Math.PI / nBlades);
            const { points, avgZ } = getBladePointsAndDepth(
                phi, r_in, r_out, b_px, config.impellerType, cx, y_imp
            );

            // Depth-dependent shading: front blades are brighter
            const brightness = 0.65 + 0.35 * ((avgZ / r_out) * 0.5 + 0.5);
            const baseH = 330; // pink hue
            const fillColor = `hsl(${baseH}, 75%, ${Math.round(50 * brightness)}%)`;
            const strokeColor = `hsl(${baseH}, 80%, ${Math.round(38 * brightness)}%)`;

            drawElements.push({
                avgZ,
                draw: () => {
                    simCtx.save();
                    simCtx.fillStyle = fillColor;
                    simCtx.strokeStyle = strokeColor;
                    simCtx.lineWidth = 1.2;
                    simCtx.beginPath();
                    simCtx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        simCtx.lineTo(points[i].x, points[i].y);
                    }
                    simCtx.closePath();
                    simCtx.fill();
                    simCtx.stroke();
                    simCtx.restore();
                }
            });
        }
    });

    // Sort elements back-to-front (ascending Z)
    drawElements.sort((a, b) => a.avgZ - b.avgZ);
    drawElements.forEach(el => el.draw());

    // Draw vessel outline so the tank height change is visible
    simCtx.save();
    simCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    simCtx.lineWidth = 2;
    simCtx.lineCap = 'round';
    simCtx.beginPath();
    simCtx.moveTo(lx, y_top);
    simCtx.lineTo(lx, y_cyl);
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        simCtx.ellipse(cx, y_cyl, D_px / 2, hb, 0, Math.PI, 0, true);
    } else if (config.headType === 'hemispherical') {
        simCtx.arc(cx, y_cyl, D_px / 2, Math.PI, 0, true);
    } else {
        simCtx.lineTo(rx, y_cyl);
    }
    simCtx.lineTo(rx, y_top);
    simCtx.stroke();
    simCtx.restore();

    simCtx.stroke();

    // Draw simulation parameters badge in the top-right corner
    simCtx.save();

    // Calculate Np and Pv
    const n_sim = config.simSpeed / 60;
    const Re_sim = calculateReVal(n_sim);
    const { Np } = calculateNpCurve(Re_sim);
    const effRho = getEffectiveDensity();
    const d = config.d || 0.060;
    const V_liq = calcLiquidVolumeForPv() || 0.001;
    const P_sim = Np * effRho * Math.pow(n_sim, 3) * Math.pow(d, 5);
    const Pv_sim = P_sim / V_liq;

    const badgeTitle = 'シミュレーション値';
    const txtRe = `Re: ${Math.round(Re_sim).toLocaleString()}`;
    const txtNp = `Np: ${Np.toFixed(3)}`;
    const txtPv = `Pv: ${Pv_sim.toFixed(1)} W/m³`;

    // Measure maximum text width dynamically to avoid clipping
    simCtx.font = 'bold 9px Inter, Outfit, Noto Sans JP, sans-serif';
    const textWidths = [
        simCtx.measureText(badgeTitle).width,
        simCtx.measureText(txtRe).width,
        simCtx.measureText(txtNp).width,
        simCtx.measureText(txtPv).width
    ];
    const maxTextWidth = Math.max(...textWidths);

    const badgeW = maxTextWidth + 16;
    const badgeH = 50;
    const badgeX = simCanvas.width - badgeW - 10;
    const badgeY = 15;

    // Draw background glassmorphism pill
    simCtx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // Dark translucent slate
    simCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    simCtx.lineWidth = 1;
    simCtx.beginPath();
    if (simCtx.roundRect) {
        simCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    } else {
        simCtx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    simCtx.fill();
    simCtx.stroke();

    // Draw texts
    simCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    simCtx.textBaseline = 'top';
    simCtx.textAlign = 'left';
    simCtx.fillText(badgeTitle, badgeX + 8, badgeY + 6);

    simCtx.fillStyle = '#06b6d4'; // Cyan matching simulation theme
    simCtx.fillText(txtRe, badgeX + 8, badgeY + 18);
    simCtx.fillText(txtNp, badgeX + 8, badgeY + 28);
    simCtx.fillText(txtPv, badgeX + 8, badgeY + 38);

    simCtx.restore();
    simCtx.restore();
}

// ====================================================
// Heat Transfer Calculations & Simulation Tab Logic
// ====================================================

function calculateHeatTransfer() {
    // 槽径 D_T, 翼径 d, 液密度 rho, 代表粘度 mu_eff (非ニュートンでなければmu)
    const D_T = config.DT;
    const d = config.d;
    const H_geom = config.H;
    // 固液有効物性値の取得 (固液系がONの場合は有効物性値、OFFの場合は純液体の物性値が返る)
    const effProps = getEffectiveProperties();
    const rho_L = effProps.rho;
    const Cp_L = effProps.Cp;
    const k_L = effProps.k;
    const t_w = config.wallThickness || 0.003;
    const k_w = config.wallK || 16.3;
    const r_d = config.foulingFactor || 0.0001;

    // 代表粘度の取得
    const mu_L = (rheologyData.activeModel !== 'newtonian' && typeof getEffectiveViscosity === 'function')
        ? (getEffectiveViscosity() || config.mu)
        : config.mu;

    // 現在の回転数 (rps)
    const N_rpm = config.simSpeedSync ? (expBlocks[0]?.rows[0]?.N || 300) : config.simSpeed;
    const n = Math.max(0.1, N_rpm / 60);

    // 攪拌レイノルズ数 & プラントル数
    const Re = (rho_L * n * d * d) / Math.max(1e-6, mu_L);
    const Pr = (Cp_L * mu_L) / Math.max(1e-6, k_L);

    // --- (1) 槽内液側境膜伝熱係数 h1 の計算 ---
    let K_j = 0.36;
    let K_c = 0.87;
    let alpha_j = 2 / 3, alpha_c = 0.62;
    let beta_j = 1 / 3, beta_c = 1 / 3;
    let f_factor = 1.0;

    const isBaffled = config.baffleActive && config.nB > 0 && config.Bw > 0;
    const type = config.impellerType;

    // ジャケット用定数
    if (type === 'flat-turbine') {
        K_j = isBaffled ? 0.74 : 0.54;
    } else if (type === 'propeller') {
        K_j = isBaffled ? 0.50 : 0.37;
    } else { // パドル系
        K_j = 0.36;
    }

    // コイル用定数
    if (type === 'flat-turbine') {
        K_c = 1.50; alpha_c = 2 / 3;
    } else if (type === 'propeller') {
        K_c = 0.83; alpha_c = 2 / 3;
    } else {
        K_c = 0.87; alpha_c = 0.62;
    }

    const Nu_Lj = K_j * Math.pow(Re, alpha_j) * Math.pow(Pr, beta_j) * f_factor;
    const h1_j = (Nu_Lj * k_L) / D_T;

    const Nu_Lc = K_c * Math.pow(Re, alpha_c) * Math.pow(Pr, beta_c) * f_factor;
    const h1_c = (Nu_Lc * k_L) / D_T;

    // --- (2) 伝熱面積の計算 ---
    let h_dish = 0;
    let A_dish = 0;
    const R = D_T / 2;
    const headType = config.headType;

    if (headType === 'semi-elliptical') {
        h_dish = R / 2; A_dish = 1.382 * Math.PI * R * R;
    } else if (headType === 'dish') {
        h_dish = 0.1935 * D_T; A_dish = 1.15 * Math.PI * R * R;
    } else if (headType === 'hemispherical') {
        h_dish = R; A_dish = 2.0 * Math.PI * R * R;
    } else { // flat
        h_dish = 0; A_dish = Math.PI * R * R;
    }

    const h_cyl = Math.max(0, H_geom - h_dish);
    const A_cyl = Math.PI * D_T * h_cyl;
    const Aj = A_cyl + A_dish;

    const d_co = config.coilOuterDia ?? 0.010;
    const d_ci = config.coilInnerDia ?? 0.008;
    const p_c = Math.max(d_co * 1.01, config.coilPitch ?? (2.5 * d_co));
    const D_c = (config.coilCenterDia && config.coilCenterDia > 0) ? config.coilCenterDia : 0.7 * D_T;
    const clearance = config.clearance ?? 0;
    const N_t = Math.max(1, Math.floor((H_geom - 2 * clearance) / p_c));
    const L_c = N_t * Math.PI * D_c;
    const Ac = config.coilActive ? (Math.PI * d_co * L_c) : 0;

    // --- (3) 熱媒体側境膜伝熱係数 h2 の計算 ---
    let h2_j = 0;
    let h2_c = 0;
    const isSteam = config.mediaType === 'steam';
    const W_j = config.mediaFlow || 0.05;
    const rho_j = config.mediaRho || 1000;
    const mu_j = config.mediaMu || 0.001;
    const Cp_j = config.mediaCp || 4184;
    const k_j = config.mediaK || 0.60;
    const viscCorr = config.mediaViscCorr || 1.0;
    const T_in = config.mediaTempIn;

    if (isSteam) {
        // スチームの凝縮伝熱係数 (新潟大学晶析工学研究室解説資料に基づく)
        // 飽和水(100℃)の物性
        const rho_cl = 958;
        const mu_cl = 0.00028;
        const k_cl = 0.68;
        const g = config.g || 9.806;

        // ジャケット側の凝縮 (垂直管外)
        const Gamma_j = W_j / (Math.PI * D_T);
        const Ref_j = 4 * Gamma_j / mu_cl;
        const prop_factor = Math.pow(Math.pow(k_cl, 3) * Math.pow(rho_cl, 2) * g / Math.pow(mu_cl, 2), 1 / 3);

        if (Ref_j < 2100) {
            h2_j = 1.88 * prop_factor * Math.pow(Ref_j, -1 / 3);
        } else {
            h2_j = 0.0077 * prop_factor * Math.pow(Ref_j, 0.4);
        }

        // コイル側の凝縮 (水平管内)
        if (config.coilActive) {
            const Gamma_c = W_j / L_c;
            const Ref_c = 4 * Gamma_c / mu_cl;
            h2_c = 0.76 * prop_factor * Math.pow(Ref_c, -1 / 3);
        }
    } else {
        // ジャケット側水流速と伝熱係数
        const D1 = D_T + 2 * t_w;
        const s_j = config.jacketGap || 0.010;
        const D2 = D1 + 2 * s_j;
        let Ac_flow = 0;
        let P_wet = 0;
        let D_eq = 0;
        const jacketType = config.jacketType || 'flat';
        const isSpiral = jacketType === 'spiral';
        const isFlatTangential = jacketType === 'flat-tangential';
        const isFlatRadial = jacketType === 'flat' || jacketType === 'flat-radial';
        let L_flow = Math.max(1e-6, isSpiral ? Math.PI * D_T : (isFlatTangential ? Math.PI * D_T : D_T / 2));

        if (isSpiral) {
            Ac_flow = s_j * s_j;
            P_wet = 4 * s_j;
        } else {
            Ac_flow = (Math.PI / 4) * (D2 * D2 - D1 * D1);
            P_wet = Math.PI * (D1 + D2);
        }

        D_eq = Math.max(1e-6, 4 * Ac_flow / P_wet);

        const u_j = W_j / (rho_j * Math.max(1e-6, Ac_flow));
        const Re_j = (rho_j * u_j * D_eq) / Math.max(1e-6, mu_j);
        const Pr_j = (Cp_j * mu_j) / Math.max(1e-6, k_j);

        let Nu_j = 0;
        if (Re_j < 2100) {
            // 層流: Sieder-Tate式（流路長 L_flow を利用）
            Nu_j = 1.86 * Math.pow(Re_j * Pr_j * (D_eq / L_flow), 1 / 3) * Math.pow(1.0, 0.14);
        } else if (Re_j < 10000) {
            // 遷移流: Hausenの修正式
            Nu_j = 0.116 * (Math.pow(Re_j, 2 / 3) - 125) * Math.pow((Cp_j * mu_j) / k_j, 1 / 3) * (1 + Math.pow(D_eq / L_flow, 2 / 3));
        } else {
            // 乱流: Sieder-Tate式
            Nu_j = 0.023 * Math.pow(Re_j, 0.8) * Math.pow(Pr_j, 1 / 3) * viscCorr;
        }
        Nu_j = Math.max(Nu_j, 0.0);
        h2_j = (Nu_j * k_j) / Math.max(1e-6, D_eq);

        // コイル管内の伝熱係数
        if (config.coilActive) {
            const u_c = W_j / (rho_j * (Math.PI * d_ci * d_ci / 4));
            const Re_c = (rho_j * u_c * d_ci) / Math.max(1e-6, mu_j);
            const Pr_c = (Cp_j * mu_j) / Math.max(1e-6, k_j);
            let Nu_c = 0;
            if (Re_c < 2300) {
                Nu_c = 3.66;
            } else {
                Nu_c = 0.023 * Math.pow(Re_c, 0.8) * Math.pow(Pr_c, 1 / 3) * viscCorr * (1 + 3.5 * (d_ci / D_c));
            }
            h2_c = (Nu_c * k_j) / d_ci;
        }
    }

    // --- (4) 総括伝熱係数 U の計算 ---
    const R_wall_j = t_w / k_w;
    let U_j = 0;
    if (h1_j > 0 && h2_j > 0) {
        U_j = 1 / (1 / h1_j + R_wall_j + 1 / h2_j + r_d);
    }

    const t_c_wall = Math.max(0.0005, (d_co - d_ci) / 2);
    const k_c_wall = config.coilK ?? 16.3;
    const R_wall_c = t_c_wall / k_c_wall;
    let U_c = 0;
    if (config.coilActive && h1_c > 0 && h2_c > 0) {
        U_c = 1 / (1 / h1_c + R_wall_c + 1 / h2_c + r_d);
    }

    const UA_total = U_j * Aj + (config.coilActive ? U_c * Ac : 0);

    return {
        h1_j, h2_j, U_j, Aj, R_wall_j,
        h1_c, h2_c, U_c, Ac, R_wall_c,
        r_d, UA_total,
        Cp_L, rho_L, Cp_j, W_j, T_in, isSteam
    };
}

function updateHeatCalcUI() {
    const res = calculateHeatTransfer();

    const elH1j = document.getElementById('heat-res-h1-j');
    if (elH1j) {
        elH1j.textContent = res.h1_j.toFixed(1);
        document.getElementById('heat-res-h2-j').textContent = res.h2_j.toFixed(1);
        document.getElementById('heat-res-U-j').textContent = res.U_j.toFixed(1);
        document.getElementById('heat-res-A-j').textContent = res.Aj.toFixed(4);
        document.getElementById('heat-res-Rw-j').textContent = res.R_wall_j.toExponential(2);
        document.getElementById('heat-res-rd-j').textContent = res.r_d.toExponential(2);

        if (config.coilActive) {
            document.getElementById('heat-res-h1-c').textContent = res.h1_c.toFixed(1);
            document.getElementById('heat-res-h2-c').textContent = res.h2_c.toFixed(1);
            document.getElementById('heat-res-U-c').textContent = res.U_c.toFixed(1);
            document.getElementById('heat-res-A-c').textContent = res.Ac.toFixed(4);
            document.getElementById('heat-res-Rw-c').textContent = res.R_wall_c.toExponential(2);
            document.getElementById('heat-res-rd-c').textContent = res.r_d.toExponential(2);
        } else {
            const dashes = '-';
            document.getElementById('heat-res-h1-c').textContent = dashes;
            document.getElementById('heat-res-h2-c').textContent = dashes;
            document.getElementById('heat-res-U-c').textContent = dashes;
            document.getElementById('heat-res-A-c').textContent = dashes;
            document.getElementById('heat-res-Rw-c').textContent = dashes;
            document.getElementById('heat-res-rd-c').textContent = dashes;
        }

        document.getElementById('heat-res-UA-total').textContent = res.UA_total.toFixed(1);
        const totalArea = res.Aj + (config.coilActive ? res.Ac : 0);
        document.getElementById('heat-res-U-avg').textContent = totalArea > 0 ? (res.UA_total / totalArea).toFixed(1) : '0.0';
    }

    const T_L = heatSimTemp;
    let Q = 0;
    let T_out = res.T_in;

    if (!res.isSteam) {
        const exponent = -(res.UA_total) / Math.max(1e-3, res.W_j * res.Cp_j);
        T_out = T_L + (res.T_in - T_L) * Math.exp(exponent);
        Q = res.W_j * res.Cp_j * (res.T_in - T_out);
    } else {
        T_out = res.T_in;
        Q = res.UA_total * (res.T_in - T_L);
    }

    const elQ = document.getElementById('heat-res-Q');
    const elQv = document.getElementById('heat-res-Qv');
    const elTout = document.getElementById('heat-res-Tout');
    if (elQ) elQ.textContent = Q.toFixed(1) + " W";
    if (elQv) {
        const V_liq = (config.V_act && config.V_act > 0) ? (config.V_act * 1e-3) : (calcLiquidVolumeForPv() || 0.001);
        const Qv = Q / Math.max(1e-6, V_liq);
        elQv.textContent = Qv.toFixed(1) + " W/m³";
    }
    if (elTout) elTout.textContent = T_out.toFixed(1) + " °C";

    const tempDisp = document.getElementById('heat-sim-temp-display');
    if (tempDisp) {
        tempDisp.textContent = T_L.toFixed(2) + " °C";
        const tMin = 10, tMax = 90;
        const ratio = Math.max(0, Math.min(1, (T_L - tMin) / (tMax - tMin)));
        const hue = Math.round(240 - 240 * ratio);
        tempDisp.style.color = `hsl(${hue}, 85%, 55%)`;
    }
    updateHeatResistChart(res);
}

function initHeatSimulation() {
    const canvas = document.getElementById('heatSimCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (heatSimAnimId) {
        cancelAnimationFrame(heatSimAnimId);
        heatSimAnimId = null;
    }

    heatSimTime = 0.0;
    const timeEl = document.getElementById('heat-sim-time');
    if (timeEl) timeEl.textContent = '0.0';
    heatSimTemp = config.liquidTempInit ?? 20.0;
    heatParticles = [];
    heatSimLastTime = null;

    heatChartData.times = [0];
    heatChartData.liquidTemp = [heatSimTemp];
    const res = calculateHeatTransfer();
    heatChartData.mediaTempOut = [res.T_in];

    initHeatChart();
    initHeatResistChart();

    // グリッドデータの初期化 (温度コンター時間平均用)
    const gridCols = 45;
    const gridRows = 32;
    thermalGridData = Array.from({ length: gridCols * gridRows }, () => ({
        smoothTemp: heatSimTemp
    }));

    if (!thermalOffscreenCanvas) {
        thermalOffscreenCanvas = document.createElement('canvas');
    }
    thermalOffscreenCanvas.width = gridCols;
    thermalOffscreenCanvas.height = gridRows;

    const count = 1000;
    const coords = getVesselVisualCoords(canvas.width, canvas.height);
    const { lx, rx, y_liquid, cx, scale, hb, y_cyl, y_deepest, D_px } = coords;

    const props = getEffectiveProperties();
    const phi_s = props.phi_s; // 固体体積分率 (0〜1)
    const isSL = config.solidLiquidActive;

    for (let i = 0; i < count; i++) {
        let px = lx + Math.random() * D_px;
        let py = y_liquid + Math.random() * (getVesselBottomY(px, coords) - y_liquid);

        px = Math.max(lx + 2, Math.min(rx - 2, px));
        py = Math.max(y_liquid + 2, Math.min(getVesselBottomY(px, coords) - 2, py));

        const isSolid = isSL && (Math.random() < phi_s);
        const rho_i = isSolid ? (config.rho_S ?? 2500) : (config.rho);
        const cp_i = isSolid ? (config.solidCp ?? 800) : (config.liquidCp ?? 4184);
        const relSize = 0.6 + Math.random() * 0.6;
        const volume_i = Math.pow(relSize, 3);
        const mass_i = rho_i * volume_i;

        heatParticles.push({
            x: px,
            y: py,
            vx: 0,
            vy: 0,
            temp: heatSimTemp,
            relSize: relSize,
            isSolid: isSolid,
            rho: rho_i,
            cp: cp_i,
            m: mass_i,
            relVortexX: 0.75 + Math.random() * 0.5,
            relVortexY: 0.75 + Math.random() * 0.5
        });
    }

    drawHeatSimulation();
    updateHeatCalcUI();
}

function startHeatSimulation() {
    if (heatSimActive) return;
    heatSimActive = true;

    const btnStart = document.getElementById('btn-heat-sim-start');
    const btnPause = document.getElementById('btn-heat-sim-pause');
    if (btnStart && btnPause) {
        btnStart.disabled = true;
        btnPause.disabled = false;
    }

    heatSimLastTime = performance.now();

    function loop() {
        if (!heatSimActive) return;
        updateHeatPhysics();
        drawHeatSimulation();
        heatSimAnimId = requestAnimationFrame(loop);
    }
    loop();
}

function pauseHeatSimulation() {
    heatSimActive = false;
    const btnStart = document.getElementById('btn-heat-sim-start');
    const btnPause = document.getElementById('btn-heat-sim-pause');
    if (btnStart && btnPause) {
        btnStart.disabled = false;
        btnPause.disabled = true;
    }
    if (heatSimAnimId) {
        cancelAnimationFrame(heatSimAnimId);
        heatSimAnimId = null;
    }
}

function resetHeatSimulation() {
    pauseHeatSimulation();
    initHeatSimulation();
}

function _calcColorScaleRange(T_in) {
    const meanTemp = isNaN(heatSimTemp) ? 20.0 : heatSimTemp;

    let tMin, tMax;
    if (heatColorScaleMode === 'absolute') {
        const T0 = config.liquidTempInit ?? 20.0;
        tMin = Math.min(T0, T_in);
        tMax = Math.max(T0, T_in);
        if (tMax - tMin < 0.5) {
            tMin -= 0.5;
            tMax += 0.5;
        }
    } else {
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

function _drawColorBar(ctx, canvas, tMin, tMax) {
    const barW = 12;
    const barH = 110;
    const barX = 14;
    const barY = canvas.height - barH - 40;
    const steps = barH;

    for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const hue = Math.round(240 - 240 * ratio);
        ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
        ctx.fillRect(barX, barY + barH - i - 1, barW, 1);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.font = 'bold 8px Inter, Noto Sans JP, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const labelX = barX + barW + 4;
    ctx.fillText(`${tMax.toFixed(1)} °C`, labelX, barY + 4);
    const tMid = (tMin + tMax) / 2;
    ctx.fillText(`${tMid.toFixed(1)} °C`, labelX, barY + barH / 2);
    ctx.fillText(`${tMin.toFixed(1)} °C`, labelX, barY + barH - 4);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '7px Inter, Noto Sans JP, sans-serif';
    ctx.textBaseline = 'top';
    const modeLabel = heatColorScaleMode === 'absolute' ? '絶対スケール' : '相対スケール';
    ctx.fillText(modeLabel, barX, barY + barH + 3);
}

function updateHeatPhysics() {
    const now = performance.now();
    if (!heatSimLastTime) {
        heatSimLastTime = now;
        return;
    }
    const dt = Math.min(0.03, (now - heatSimLastTime) / 1000) * 1.5;
    heatSimLastTime = now;

    heatSimTime += dt;
    document.getElementById('heat-sim-time').textContent = heatSimTime.toFixed(1);

    const res = calculateHeatTransfer();
    const V_act = getLiquidVolume();
    const M_L = res.rho_L * V_act;

    let Q = 0;
    let T_out = res.T_in;
    if (!res.isSteam) {
        const exponent = -(res.UA_total) / Math.max(1e-3, res.W_j * res.Cp_j);
        T_out = heatSimTemp + (res.T_in - heatSimTemp) * Math.exp(exponent);
        Q = res.W_j * res.Cp_j * (res.T_in - T_out);
    } else {
        T_out = res.T_in;
        Q = res.UA_total * (res.T_in - heatSimTemp);
    }

    const dT = (Q / (M_L * res.Cp_L)) * dt;
    heatSimTemp += dT;

    const lastTime = heatChartData.times[heatChartData.times.length - 1] || 0;
    if (heatSimTime - lastTime >= 1.0) {
        heatChartData.times.push(Math.round(heatSimTime));
        heatChartData.liquidTemp.push(heatSimTemp);
        heatChartData.mediaTempOut.push(T_out);

        if (heatChartData.times.length > 150) {
            heatChartData.times.shift();
            heatChartData.liquidTemp.shift();
            heatChartData.mediaTempOut.shift();
        }

        updateHeatChart();
    }

    updateHeatCalcUI();

    const heatCanvas = document.getElementById('heatSimCanvas');
    const coords = getVesselVisualCoords(
        heatCanvas ? heatCanvas.width : null,
        heatCanvas ? heatCanvas.height : null
    );
    const { cx, D_px, scale, y_deepest, y_cyl, y_liquid, lx, rx } = coords;
    const N_rpm = config.simSpeedSync ? (expBlocks[0]?.rows[0]?.N || 300) : config.simSpeed;
    const wallThresh_px = 12;
    // コイル中心径（px）
    const D_c_real = (config.coilCenterDia && config.coilCenterDia > 0) ? config.coilCenterDia : 0.7 * config.DT;
    const D_c_px = D_c_real * scale;

    let coils = [];
    if (config.coilActive) {
        const d_co_m = config.coilOuterDia ?? 0.010;
        const D_c_real_h = (config.coilCenterDia && config.coilCenterDia > 0)
            ? config.coilCenterDia : 0.7 * config.DT;
        const D_c_px_h = D_c_real_h * scale;
        const c_r = Math.max(4, (d_co_m / 2) * scale);
        const p_c_m = Math.max(d_co_m * 1.01, config.coilPitch ?? (2.5 * d_co_m));
        const p_c_px = p_c_m * scale;
        // 描画と同じ底面基準を使う
        const y_bot_vessel_h = getVesselBottomY(cx + D_c_px_h / 2 + c_r, coords);
        const coilSpan_px = y_bot_vessel_h - c_r - y_liquid - 20;
        const N_t = Math.max(1, Math.floor(coilSpan_px / p_c_px));
        const pitchUsed_px = coilSpan_px / N_t;
        for (let j = 0; j < N_t; j++) {
            // 描画と同じ cy_coil / cy_mid を使用（左右で異なる位置）
            const cy_coil = y_liquid + 14 + j * pitchUsed_px + pitchUsed_px / 2;
            const cy_mid = cy_coil + pitchUsed_px / 2;
            coils.push({ x: cx - D_c_px_h / 2, y: cy_mid, r: c_r }); // 左側断面
            coils.push({ x: cx + D_c_px_h / 2, y: cy_coil, r: c_r }); // 右側断面
        }
    }

    const gridCols = 15;
    const gridRows = 15;
    const gridWidth = (rx - lx) / gridCols;
    const gridHeight = (y_deepest - y_liquid) / gridRows;
    let grid = Array.from({ length: gridCols * gridRows }, () => ({ temps: [], count: 0, sum_mCpT: 0, sum_mCp: 0 }));

    // 密度平滑化（自己分散）のための粒子密度のカウント（第1パス）
    let densityGrid = new Int32Array(gridCols * gridRows);
    heatParticles.forEach(p => {
        const cIdx = Math.max(0, Math.min(gridCols - 1, Math.floor((p.x - lx) / gridWidth)));
        const rIdx = Math.max(0, Math.min(gridRows - 1, Math.floor((p.y - y_liquid) / gridHeight)));
        densityGrid[rIdx * gridCols + cIdx]++;
    });

    heatParticles.forEach(p => {
        const colIdx_init = Math.max(0, Math.min(gridCols - 1, Math.floor((p.x - lx) / gridWidth)));
        const rowIdx_init = Math.max(0, Math.min(gridRows - 1, Math.floor((p.y - y_liquid) / gridHeight)));

        // 周囲の密度の差による反発力を計算（過密グリッドから過疎グリッドへ向かう速度補正）
        const getDensity = (r, c) => {
            if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) return 0; // 槽外への反発は生じさせない
            return densityGrid[r * gridCols + c];
        };

        const dL = getDensity(rowIdx_init, colIdx_init - 1);
        const dR = getDensity(rowIdx_init, colIdx_init + 1);
        const dU = getDensity(rowIdx_init - 1, colIdx_init);
        const dD = getDensity(rowIdx_init + 1, colIdx_init);

        // 密度勾配の逆方向への力（分散・嵇均化）
        // speedMagnitude と同じ尺度系の定数にする：典型的な
        // speedMagnitude(基準条件で 1.75 px/frame) に対して 2% 程度。
        const diffCoeff = 0.02 * Math.max(0.05, 0.00487 * (1.6 * (N_rpm / 60) * Math.pow(config.d, 3) / Math.pow(config.DT, 2)) * scale);
        const diffX = (dL - dR) * diffCoeff;
        const diffY = (dU - dD) * diffCoeff;

        const fluidVel = getMeanFlowVelocity(p.x, p.y, N_rpm, coords, p.relVortexX, p.relVortexY);
        const Nqc_heat = { 'pitched-paddle': 1.6, 'flat-paddle': 1.2, 'flat-turbine': 1.4, 'propeller': 2.0, 'faudler': 1.3 }[config.impellerType] || 1.4;

        // 流速への追従性を高める (0.08 -> 0.16)
        // インペラからの強力な吐出や壁沿いの循環といった「対流の動き（流動パターン）」をダイナミックかつ滑らかに見せる
        p.vx += (fluidVel.vx - p.vx) * 0.16;
        p.vy += (fluidVel.vy - p.vy) * 0.16;

        // 密度補正（斥力）を適用
        p.vx += diffX;
        p.vy += diffY;

        // 乱流揺らぎ（ランダムウォーク）
        // speedMagnitude = C×v_phys×scale なので、乱流も同じ尺度系で表現する。
        // heatSpeedRef: 現在の運転条件での speedMagnitude 相当値
        const heatSpeedRef = Math.max(0.05, 0.00487 * (Nqc_heat * (N_rpm / 60) * Math.pow(config.d, 3) / Math.pow(config.DT, 2)) * scale);
        const turb = (0.20 + 0.10 * (N_rpm / 300)) * (p.relSize || 1.0) * (heatSpeedRef / 1.75);

        p.vx += (Math.random() - 0.5) * turb;
        p.vy += (Math.random() - 0.5) * turb;

        // 壁・底面近傍の引き寄せ力（ジャケット伝熱の表現）
        // wallMargin・wallPull も speedMagnitude と同じ尺度系。
        const wallMargin = D_px * 0.07; // 槽径の7%（スケール不問で一定割合）
        const distToLeft = p.x - lx;
        const distToRight = rx - p.x;
        const y_bot_p = getVesselBottomY(p.x, coords);
        const distToBot = y_bot_p - p.y;
        const wallPull = 0.015 * heatSpeedRef; // speedMagnitude 典型値に対する小数割合
        if (distToLeft < wallMargin) p.vx -= wallPull * (1 - distToLeft / wallMargin);
        if (distToRight < wallMargin) p.vx += wallPull * (1 - distToRight / wallMargin);
        if (distToBot < wallMargin) p.vy += wallPull * (1 - distToBot / wallMargin);

        // 速度の抗力（ダンピング）を緩和し、流れの慣性と循環速度をしっかりと表現する (0.88 -> 0.95)
        p.vx *= 0.95;
        p.vy *= 0.95;

        p.x += p.vx;
        p.y += p.vy;

        // 座標値が不正になった場合のフェイルセーフ
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
            p.x = cx + (Math.random() - 0.5) * D_px * 0.5;
            p.y = y_liquid + 5 + Math.random() * (y_deepest - y_liquid - 10);
            p.vx = 0;
            p.vy = 0;
        }

        if (p.x < lx + 2) { p.x = lx + 2; p.vx = Math.abs(p.vx) * 0.15; p.vy *= 0.9; }
        if (p.x > rx - 2) { p.x = rx - 2; p.vx = -Math.abs(p.vx) * 0.15; p.vy *= 0.9; }
        if (p.y < y_bot_p - 2) {
            // Check surface collision if particle goes too high
            const t_sec = performance.now() / 1000;
            const rpm = config.simSpeedSync ? (expBlocks[0]?.rows[0]?.N || 300) : config.simSpeed;
            const y_surf = getSharedSurfaceY(p.x, coords, rpm, t_sec);
            if (p.y < y_surf + 2) {
                p.y = y_surf + 2;
                p.vy = Math.abs(p.vy) * 0.1;
                p.vx *= 0.8;
            }
        }
        if (p.y > y_bot_p - 2) { p.y = y_bot_p - 2; p.vy = -Math.abs(p.vy) * 0.15; p.vx *= 0.9; }

        let trRate = 0.05 * dt;

        const distToBottom = y_bot_p - p.y;
        if (distToLeft < wallThresh_px || distToRight < wallThresh_px || distToBottom < wallThresh_px) {
            p.temp += (res.T_in - p.temp) * trRate * 30.0;
        }

        if (config.coilActive && coils.length > 0) {
            coils.forEach(c => {
                const dx = p.x - c.x;
                const dy = p.y - c.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);
                const minDist = c.r + (p.relSize || 1.0) * 2; // 熱粒子の見た目の半径は約2px

                // コイル近傍での伝熱判定
                if (distSq < (c.r + 15) * (c.r + 15)) {
                    p.temp += (res.T_in - p.temp) * trRate * 45.0;
                }

                // 剛体衝突（透過防止）
                if (dist < minDist && dist > 0.01) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    p.x = c.x + nx * minDist;
                    p.y = c.y + ny * minDist;

                    const vDotN = p.vx * nx + p.vy * ny;
                    if (vDotN < 0) {
                        p.vx -= 1.4 * vDotN * nx;
                        p.vy -= 1.4 * vDotN * ny;
                        p.vx *= 0.5;
                        p.vy *= 0.5;
                    }
                }
            });
        }

        const colIdx = Math.max(0, Math.min(gridCols - 1, Math.floor((p.x - lx) / gridWidth)));
        const rowIdx = Math.max(0, Math.min(gridRows - 1, Math.floor((p.y - y_liquid) / gridHeight)));
        const gIdx = rowIdx * gridCols + colIdx;
        grid[gIdx].temps.push(p);

        const p_m = (p.m !== undefined && !isNaN(p.m)) ? p.m : (p.relSize * p.relSize * 1.0);
        const p_cp = (p.cp !== undefined && !isNaN(p.cp)) ? p.cp : 4184;

        grid[gIdx].sum_mCpT += p_m * p_cp * p.temp;
        grid[gIdx].sum_mCp += p_m * p_cp;
        grid[gIdx].count++;
    });

    grid.forEach(g => {
        if (g.count > 1 && g.sum_mCp > 0) {
            const avg = g.sum_mCpT / g.sum_mCp;
            if (!isNaN(avg)) {
                g.temps.forEach(p => {
                    p.temp += (avg - p.temp) * 0.12;
                    p.temp += (heatSimTemp - p.temp) * 0.001;
                });
            }
        }
    });

    // --- 粒子平均温度をマクロバルク温度 heatSimTemp に一致させるための保存則補正 ---
    let sum_mCp = 0;
    let sum_mCpT = 0;
    for (let i = 0; i < heatParticles.length; i++) {
        const p = heatParticles[i];
        const p_m = (p.m !== undefined && !isNaN(p.m)) ? p.m : ((p.relSize || 1.0) * (p.relSize || 1.0) * 1.0);
        const p_cp = (p.cp !== undefined && !isNaN(p.cp)) ? p.cp : 4184;
        const mCp = p_m * p_cp;
        sum_mCp += mCp;
        sum_mCpT += mCp * p.temp;
    }

    if (sum_mCp > 0) {
        const tMeanPart = sum_mCpT / sum_mCp;
        const dT_shift = heatSimTemp - tMeanPart;

        // 平均からの差分を維持したまま、全体をシフトして平均値を heatSimTemp に一致させる
        for (let i = 0; i < heatParticles.length; i++) {
            heatParticles[i].temp += dT_shift;

            // 温度の物理的な上下限のクリップ (凍結や極端な高温を防ぐ安全弁)
            const lowerBound = Math.min(heatSimTemp, res.T_in) - 5.0;
            const upperBound = Math.max(heatSimTemp, res.T_in) + 5.0;
            heatParticles[i].temp = Math.max(lowerBound, Math.min(upperBound, heatParticles[i].temp));
        }
    }
}

function drawHeatSimulation() {
    const canvas = document.getElementById('heatSimCanvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    const coords = getVesselVisualCoords(canvas.width, canvas.height);
    const { cx, D_px, scale, hb, y_deepest, y_cyl, y_liquid, y_top, lx, rx } = coords;

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
    ctx.moveTo(lx - gap_px, y_top);
    ctx.lineTo(lx - gap_px, y_cyl);
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        ctx.ellipse(cx, y_cyl, D_px / 2 + gap_px, hb + gap_px, 0, Math.PI, 0, true);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl, D_px / 2 + gap_px, Math.PI, 0, true);
    } else {
        ctx.lineTo(rx + gap_px, y_cyl);
    }
    ctx.lineTo(rx + gap_px, y_top);
    ctx.stroke();
    ctx.restore();

    // Calculate local parabolic vortex surface height based on rotation speed
    let vortexDepth = Math.pow(N_rpm / 600, 2) * D_px * 0.05;
    if (config.baffleActive) {
        vortexDepth *= 0.12; // Baffled vortex is significantly suppressed
    }
    const maxAllowedDepth = Math.max(0, (y_deepest - y_liquid) * 0.6);
    vortexDepth = Math.min(vortexDepth, maxAllowedDepth);

    // Wave parameters
    const t_wave = performance.now() / 1000;
    const waveAmp = (N_rpm / 600) * (config.baffleActive ? 0.7 : 2.2);
    const waveFreq = 2.0 + (N_rpm / 300) * 5.0;

    // Helper to get local surface Y coordinate at any X
    const getLocalSurfaceY = (x_val) => {
        const u = (x_val - cx) / (D_px / 2);
        let waveOffset = 0;
        if (N_rpm > 5) {
            const w1 = Math.sin(waveFreq * t_wave - (2 * Math.PI / D_px) * (x_val - lx));
            const w2 = Math.cos(waveFreq * 1.7 * t_wave + (4 * Math.PI / D_px) * (x_val - lx));
            waveOffset = waveAmp * (w1 + 0.35 * w2);
        }
        const y_surf = y_liquid + vortexDepth * (0.5 - u * u) + waveOffset;
        return Math.max(y_liquid - 10, y_surf);
    };

    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
    ctx.beginPath();

    // Draw curved top surface
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
        const t_step = i / steps;
        const px = lx + t_step * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
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

    // Draw Liquid Surface Outline (parabolic curve)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t_step = i / steps;
        const px = lx + t_step * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
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
            ctx.moveTo(lx - 6, y);
            ctx.lineTo(lx, y);
            ctx.moveTo(rx, y);
            ctx.lineTo(rx + 6, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    ctx.save();

    // 液相領域にクリップするためのパスを作成（容器の底と液面を合わせたパス）
    ctx.beginPath();
    const steps_clip = 40;
    // 液面のカーブを描画
    for (let i = 0; i <= steps_clip; i++) {
        const t_step = i / steps_clip;
        const px = lx + t_step * D_px;
        const py = getLocalSurfaceY(px);
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    // 容器の底面への右側
    ctx.lineTo(rx, y_cyl);
    // 容器の底部の形状に応じたパス
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        ctx.ellipse(cx, y_cyl, D_px / 2, hb, 0, 0, Math.PI, false);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl, D_px / 2, 0, Math.PI, false);
    } else {
        ctx.lineTo(lx, y_cyl);
    }
    ctx.closePath();
    ctx.clip(); // 液相内部のみ描画するようにクリッピング

    // ダイナミックにカラースケールの範囲を計算
    const { tMin, tMax } = _calcColorScaleRange(T_in);
    const meanTemp = isNaN(heatSimTemp) ? 20.0 : heatSimTemp;

    if (heatShowThermalMap) {
        // --- ① カーネル平滑化法 ＆ ② 時間平均（タイムアベレージ）を用いた温度コンター表示 ---
        const gridCols = 45;
        const gridRows = 32;
        const w_cell = (rx - lx) / gridCols;
        const h_cell = (y_deepest - y_liquid) / gridRows;

        // グリッドデータおよびオフスクリーンキャンバスの初期化/保証
        if (!thermalGridData || thermalGridData.length !== gridCols * gridRows) {
            thermalGridData = Array.from({ length: gridCols * gridRows }, () => ({
                smoothTemp: heatSimTemp
            }));
        }
        if (!thermalOffscreenCanvas) {
            thermalOffscreenCanvas = document.createElement('canvas');
            thermalOffscreenCanvas.width = gridCols;
            thermalOffscreenCanvas.height = gridRows;
        }

        const offCanvas = thermalOffscreenCanvas;
        const offCtx = offCanvas.getContext('2d');
        offCtx.clearRect(0, 0, gridCols, gridRows);

        const h_smooth = 25.0; // スムージング半径 [px]
        const h_smooth_sq = h_smooth * h_smooth;
        const props = getEffectiveProperties();

        // 代表的な熱容量（粒子が周囲にない部分での加重平均バイアス用）
        const defaultM_Cp = 0.05 * ((props.Cp ?? 4184) * (props.rho ?? 1000) * 1.0);

        // 時間平均用の補間係数（ポーズ中はチラつき更新をしないため、現在の表示を維持）
        const beta = heatSimActive ? 0.85 : 0.0;

        for (let r = 0; r < gridRows; r++) {
            const yc = y_liquid + (r + 0.5) * h_cell;
            for (let c = 0; c < gridCols; c++) {
                const xc = lx + (c + 0.5) * w_cell;
                const gIdx = r * gridCols + c;

                let sum_w_mCpT = 0;
                let sum_w_mCp = 0;

                // 各粒子からの距離と熱容量(m * Cp)に基づく重み付き集計 (カーネル平滑化)
                for (let i = 0; i < heatParticles.length; i++) {
                    const p = heatParticles[i];
                    const dx = p.x - xc;
                    const dy = p.y - yc;
                    const distSq = dx * dx + dy * dy;

                    // カーネルの有効影響範囲 (2.5倍) 以内のみ集計して高速化
                    if (distSq < 6.25 * h_smooth_sq) {
                        const weight = Math.exp(-distSq / h_smooth_sq); // ガウスカーネル
                        const p_m = (p.m !== undefined && !isNaN(p.m)) ? p.m : ((p.relSize || 1.0) * (p.relSize || 1.0) * 1.0);
                        const p_cp = (p.cp !== undefined && !isNaN(p.cp)) ? p.cp : 4184;
                        const mCp = p_m * p_cp;

                        const p_temp = isNaN(p.temp) ? meanTemp : p.temp;
                        sum_w_mCpT += weight * mCp * p_temp;
                        sum_w_mCp += weight * mCp;
                    }
                }

                // 熱容量ベースの加重平均温度の算出 (粒子が極端に少ない壁際等はバルク液温に漸近)
                let rawTemp = (sum_w_mCpT + defaultM_Cp * meanTemp) / (sum_w_mCp + defaultM_Cp);
                if (isNaN(rawTemp)) {
                    rawTemp = meanTemp;
                }

                // 時間平均 (EMA) による時間チラつき防止
                let currentSmooth = thermalGridData[gIdx].smoothTemp;
                if (currentSmooth === undefined || isNaN(currentSmooth)) {
                    currentSmooth = meanTemp;
                }
                let newSmooth = beta * currentSmooth + (1 - beta) * rawTemp;
                if (isNaN(newSmooth)) {
                    newSmooth = meanTemp;
                }
                thermalGridData[gIdx].smoothTemp = newSmooth;

                // 色（HSL）への変換とオフスクリーン描画
                const ratio = Math.max(0, Math.min(1, (newSmooth - tMin) / Math.max(1e-3, tMax - tMin)));
                const hue = Math.round(240 - 240 * ratio); // 青(240) から 赤(0)

                offCtx.fillStyle = `hsl(${hue}, 85%, 55%)`;
                offCtx.fillRect(c, r, 1, 1);
            }
        }

        // バイリニア補間を適用してオフスクリーンから拡大描画 (サーモグラフィ)
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(offCanvas, lx, y_liquid, rx - lx, y_deepest - y_liquid);
    } else {
        // --- 従来どおりの熱粒子表示 ---
        heatParticles.forEach(p => {
            const ratio = Math.max(0, Math.min(1, (p.temp - tMin) / Math.max(1e-3, tMax - tMin)));
            const hue = Math.round(240 - 240 * ratio);

            ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.8 * p.relSize, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    if (heatShowThermalMap) {
        _drawColorBar(ctx, canvas, tMin, tMax);
    }
    ctx.restore();




    const nowPerf = performance.now();
    let angle = 0;
    if (heatSimActive) {
        const dtSec = Math.min((nowPerf - (simLastFrameTime || nowPerf)) / 1000, 0.05);
        const omega = (N_rpm > 5) ? (N_rpm * Math.PI / 30) : 0;
        simImpellerAngle += omega * dtSec;
        simImpellerAngle = simImpellerAngle % (2 * Math.PI);
    }
    simLastFrameTime = nowPerf;
    angle = simImpellerAngle;

    // --- コイル描画（粒子より前面・インペラより後面） ---
    if (config.coilActive) {
        ctx.save();
        const coilFill = `hsl(${mediaHue}, 80%, 48%)`;
        const coilStroke = `hsl(${mediaHue}, 70%, 35%)`;

        // コイル寸法（configから読む）
        const d_co_m = config.coilOuterDia ?? 0.010;
        const D_c_real = (config.coilCenterDia && config.coilCenterDia > 0)
            ? config.coilCenterDia : 0.7 * config.DT;
        const D_c_px = D_c_real * scale;
        const coilR = Math.max(4, (d_co_m / 2) * scale); // 管断面半径 [px]

        // Use the outer edge of the coil for the bottom limit
        const y_bot_vessel = getVesselBottomY(cx + D_c_px / 2 + coilR, coords);
        const coilSpan = y_bot_vessel - coilR - y_liquid - 20;
        const p_c_m = Math.max(d_co_m * 1.01, config.coilPitch ?? (2.5 * d_co_m));
        const p_c_px = p_c_m * scale;
        const N_t = Math.max(1, Math.floor(coilSpan / p_c_px));
        const pitch = coilSpan / N_t; // 実際に使うピッチ [px]

        for (let j = 0; j < N_t; j++) {
            const cy_coil = y_liquid + 14 + j * pitch + pitch / 2;
            const cy_mid = cy_coil + pitch / 2;

            // 左側断面（後ろ側）
            ctx.beginPath();
            ctx.ellipse(cx - D_c_px / 2, cy_mid, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${mediaHue}, 70%, 38%)`;
            ctx.fill();
            ctx.strokeStyle = coilStroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 右側断面（後ろ側）
            ctx.beginPath();
            ctx.ellipse(cx + D_c_px / 2, cy_coil, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${mediaHue}, 70%, 38%)`;
            ctx.fill();
            ctx.stroke();

            // 右→左の連結（上半分）
            ctx.beginPath();
            ctx.strokeStyle = coilFill;
            ctx.lineWidth = coilR * 1.1;
            ctx.lineCap = 'round';
            ctx.moveTo(cx + D_c_px / 2, cy_coil);
            ctx.bezierCurveTo(
                cx + D_c_px / 2 - coilR * 1.5, cy_coil + pitch * 0.15,
                cx - D_c_px / 2 + coilR * 1.5, cy_mid - pitch * 0.15,
                cx - D_c_px / 2, cy_mid
            );
            ctx.stroke();

            // 連結弧の境界線
            ctx.beginPath();
            ctx.strokeStyle = coilStroke;
            ctx.lineWidth = 1;
            ctx.lineCap = 'butt';
            ctx.moveTo(cx + D_c_px / 2, cy_coil);
            ctx.bezierCurveTo(
                cx + D_c_px / 2 - coilR * 1.5, cy_coil + pitch * 0.15,
                cx - D_c_px / 2 + coilR * 1.5, cy_mid - pitch * 0.15,
                cx - D_c_px / 2, cy_mid
            );
            ctx.stroke();

            // 前面断面（光沢ハイライト付き）
            ctx.beginPath();
            ctx.ellipse(cx - D_c_px / 2, cy_mid, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            ctx.fillStyle = coilFill;
            ctx.fill();
            ctx.strokeStyle = coilStroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(cx + D_c_px / 2, cy_coil, coilR * 0.55, coilR, 0, 0, Math.PI * 2);
            ctx.fillStyle = coilFill;
            ctx.fill();
            ctx.stroke();

            // ハイライト
            ctx.beginPath();
            ctx.ellipse(cx - D_c_px / 2 - coilR * 0.15, cy_mid - coilR * 0.28, coilR * 0.18, coilR * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(cx + D_c_px / 2 - coilR * 0.15, cy_coil - coilR * 0.28, coilR * 0.18, coilR * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    const clearance_px = config.clearance * scale;
    const b_px = config.b * scale;
    const y_bottom_impeller = y_deepest - clearance_px - b_px / 2;
    const d_px = config.d * scale;
    const r_hub = 5;
    const r_in = r_hub;
    const r_out = d_px / 2;

    // --- 設定に基づく翼枚数 ---
    const bladeCountMap = {
        'flat-turbine': 6,
        'pitched-paddle': 4,
        'flat-paddle': 2,
        'propeller': 3,
        'faudler': 3,
    };
    const defaultBlades = bladeCountMap[config.impellerType] || 2;
    const nBlades = Math.max(1, Number.isFinite(config.np) ? config.np : defaultBlades);

    const stages_y = getImpellerStagePositions(coords);

    // --- 描画要素リスト（depth-sorted） ---
    const drawElements = [];

    // シャフト
    drawElements.push({
        avgZ: -0.1,
        draw: () => {
            ctx.save();
            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, y_top - 15);
            ctx.lineTo(cx, y_bottom_impeller + b_px / 2);
            ctx.stroke();
            ctx.restore();
        }
    });

    stages_y.forEach(y_imp => {
        // ラシュトンタービンのディスク
        if (config.impellerType === 'flat-turbine') {
            drawElements.push({
                avgZ: 0.01,
                draw: () => {
                    ctx.save();
                    ctx.fillStyle = '#a1a1aa';
                    ctx.strokeStyle = '#52525b';
                    ctx.lineWidth = 0.8;
                    ctx.fillRect(cx - r_out * 0.7, y_imp - 1.5, r_out * 1.4, 3);
                    ctx.strokeRect(cx - r_out * 0.7, y_imp - 1.5, r_out * 1.4, 3);
                    ctx.restore();
                }
            });
        }

        // ハブ
        drawElements.push({
            avgZ: 0.02,
            draw: () => {
                ctx.save();
                ctx.fillStyle = '#3f3f46';
                ctx.strokeStyle = '#27272a';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(cx, y_imp, r_hub, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                const markerAngle = angle;
                const mx = cx + Math.cos(markerAngle) * (r_hub - 3);
                const my = y_imp + Math.sin(markerAngle) * (r_hub - 3);
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, y_imp);
                ctx.lineTo(mx, my);
                ctx.stroke();
                ctx.restore();
            }
        });

        // 翼
        for (let k = 0; k < nBlades; k++) {
            const phi = angle + (k * 2 * Math.PI / nBlades);
            const { points, avgZ } = getBladePointsAndDepth(
                phi, r_in, r_out, b_px, config.impellerType, cx, y_imp
            );

            const brightness = 0.65 + 0.35 * ((avgZ / r_out) * 0.5 + 0.5);
            const baseH = 330;
            const fillColor = `hsl(${baseH}, 75%, ${Math.round(50 * brightness)}%)`;
            const strokeColor = `hsl(${baseH}, 80%, ${Math.round(38 * brightness)}%)`;

            drawElements.push({
                avgZ,
                draw: () => {
                    ctx.save();
                    ctx.fillStyle = fillColor;
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
    });

    // 奥→手前の順に描画
    drawElements.sort((a, b) => a.avgZ - b.avgZ);
    drawElements.forEach(el => el.draw());

    ctx.save();
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lx, y_top);
    ctx.lineTo(lx, y_cyl);
    if (config.headType === 'semi-elliptical' || config.headType === 'dish') {
        ctx.ellipse(cx, y_cyl, D_px / 2, hb, 0, Math.PI, 0, true);
    } else if (config.headType === 'hemispherical') {
        ctx.arc(cx, y_cyl, D_px / 2, Math.PI, 0, true);
    } else {
        ctx.lineTo(rx, y_cyl);
    }
    ctx.lineTo(rx, y_top);
    ctx.stroke();

    // Draw simulation parameters badge in the top-right corner
    ctx.save();

    // Calculate Np and Pv (Sv) from curve
    const n_sim = N_rpm / 60;
    const Re_sim = calculateReVal(n_sim);
    const { Np } = calculateNpCurve(Re_sim);
    const effRho = getEffectiveDensity();
    const d = config.d || 0.060;
    const V_liq = calcLiquidVolumeForPv() || 0.001;
    const P_sim = Np * effRho * Math.pow(n_sim, 3) * Math.pow(d, 5);
    const Pv_sim = P_sim / V_liq;

    const badgeTitle = 'シミュレーション値';
    const txtRe = `Re: ${Math.round(Re_sim).toLocaleString()}`;
    const txtNp = `Np: ${Np.toFixed(3)}`;
    const txtPv = `Pv: ${Pv_sim.toFixed(1)} W/m³`;

    // Measure maximum text width dynamically to avoid clipping
    ctx.font = 'bold 9px Inter, Outfit, Noto Sans JP, sans-serif';
    const textWidths = [
        ctx.measureText(badgeTitle).width,
        ctx.measureText(txtRe).width,
        ctx.measureText(txtNp).width,
        ctx.measureText(txtPv).width
    ];
    const maxTextWidth = Math.max(...textWidths);

    const badgeW = maxTextWidth + 16;
    const badgeH = 50;
    const badgeX = canvas.width - badgeW - 10;
    const badgeY = 15;

    // Draw background glassmorphism pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // Dark translucent slate
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    // Draw texts
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(badgeTitle, badgeX + 8, badgeY + 6);

    ctx.fillStyle = '#06b6d4'; // Cyan matching simulation theme
    ctx.fillText(txtRe, badgeX + 8, badgeY + 18);
    ctx.fillText(txtNp, badgeX + 8, badgeY + 28);
    ctx.fillText(txtPv, badgeX + 8, badgeY + 38);

    ctx.restore();
    ctx.restore();
}

function _getHeatChartBaseline() {
    return (config.liquidTempInit !== undefined && config.liquidTempInit !== null)
        ? config.liquidTempInit
        : (heatChartData.liquidTemp.length ? heatChartData.liquidTemp[0] : 20);
}

function _syncHeatChartYAxisMode() {
    if (!heatChart) return;
    const baseline = _getHeatChartBaseline();
    heatChart.options.scales.y.title.text = heatColorScaleMode === 'relative'
        ? '温度差 ΔT (°C)'
        : '温度 (°C)';
    heatChart.options.scales.y.ticks.callback = function (value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return '';
        return heatColorScaleMode === 'relative'
            ? (num - baseline).toFixed(1)
            : num.toFixed(1);
    };
    heatChart.update('none');
}

function initHeatChart() {
    const ctx = document.getElementById('heatChart');
    if (!ctx) return;

    if (heatChart) {
        heatChart.destroy();
    }

    heatChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: heatChartData.times,
            datasets: [
                {
                    label: '攪拌液平均温度 T_L',
                    data: heatChartData.liquidTemp,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 1
                },
                {
                    label: '熱媒体出口温度 T_out',
                    data: heatChartData.mediaTempOut,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    borderWidth: 1.5,
                    borderDash: [3, 3],
                    tension: 0.1,
                    pointRadius: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#9ca3af', font: { size: 9 } },
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed.y;
                            const baseline = _getHeatChartBaseline();
                            const display = heatColorScaleMode === 'relative'
                                ? (value - baseline).toFixed(1)
                                : value.toFixed(1);
                            return `${context.dataset.label}: ${display} °C`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: '時間 (秒)', color: '#6b7280', font: { size: 9 } },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#9ca3af', font: { size: 8 } }
                },
                y: {
                    title: { display: true, text: '温度 (°C)', color: '#6b7280', font: { size: 9 } },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: {
                        color: '#9ca3af', font: { size: 8 }, callback: function (value) {
                            const num = Number(value);
                            if (!Number.isFinite(num)) return '';
                            return heatColorScaleMode === 'relative'
                                ? (num - _getHeatChartBaseline()).toFixed(1)
                                : num.toFixed(1);
                        }
                    }
                }
            }
        }
    });
}

function updateHeatChart() {
    if (!heatChart) return;

    // データはどちらのモードも実温度をそのまま使用
    heatChart.data.labels = heatChartData.times;
    heatChart.data.datasets[0].data = heatChartData.liquidTemp;
    heatChart.data.datasets[1].data = heatChartData.mediaTempOut;

    if (heatColorScaleMode === 'absolute') {
        // 絶対モード: 初期液温〜熱媒入口温度で固定
        const T0 = config.liquidTempInit ?? 20;
        const Tin = config.mediaTempIn ?? 80;
        heatChart.options.scales.y.min = Math.min(T0, Tin);
        heatChart.options.scales.y.max = Math.max(T0, Tin);
        heatChart.options.scales.y.title.text = '温度 (°C)';
    } else {
        // 相対モード: データ範囲に合わせて自動スケール
        heatChart.options.scales.y.min = undefined;
        heatChart.options.scales.y.max = undefined;
        heatChart.options.scales.y.title.text = '温度 (°C)';
    }

    heatChart.options.scales.y.ticks.callback = v => Number(v).toFixed(1);
    heatChart.update('none');
}

function _syncHeatChartYAxisMode() {
    updateHeatChart();
}

function initHeatResistChart() {
    const ctx = document.getElementById('heatResistChart');
    if (!ctx) return;

    if (heatResistChart) {
        heatResistChart.destroy();
    }

    heatResistChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['壁(ｼﾞｬｹｯﾄ)', 'コイル'],
            datasets: [
                {
                    label: '液側抵抗',
                    data: [0, 0],
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderWidth: 0
                },
                {
                    label: '壁抵抗',
                    data: [0, 0],
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderWidth: 0
                },
                {
                    label: '熱媒体側抵抗',
                    data: [0, 0],
                    backgroundColor: 'rgba(6, 182, 212, 0.7)',
                    borderWidth: 0
                },
                {
                    label: '汚れ抵抗',
                    data: [0, 0],
                    backgroundColor: 'rgba(107, 114, 128, 0.7)',
                    borderWidth: 0
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#9ca3af',
                        font: { size: 8 },
                        boxWidth: 8,
                        padding: 6
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 8 },
                        callback: function (value) { return value + '%'; }
                    }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 8 }
                    }
                }
            }
        }
    });
}

function updateHeatResistChart(res) {
    if (!heatResistChart) {
        initHeatResistChart();
    }
    if (!heatResistChart) return;

    // ジャケット側
    const R_h1_j = res.h1_j > 0 ? (1 / res.h1_j) : 0;
    const R_h2_j = res.h2_j > 0 ? (1 / res.h2_j) : 0;
    const R_w_j = res.R_wall_j || 0;
    const R_d = res.r_d || 0;
    const total_j = R_h1_j + R_w_j + R_h2_j + R_d;

    let pct_h1_j = 0, pct_w_j = 0, pct_h2_j = 0, pct_d_j = 0;
    if (total_j > 0) {
        pct_h1_j = (R_h1_j / total_j) * 100;
        pct_w_j = (R_w_j / total_j) * 100;
        pct_h2_j = (R_h2_j / total_j) * 100;
        pct_d_j = (R_d / total_j) * 100;
    }

    // コイル側
    let pct_h1_c = 0, pct_w_c = 0, pct_h2_c = 0, pct_d_c = 0;
    if (config.coilActive) {
        const R_h1_c = res.h1_c > 0 ? (1 / res.h1_c) : 0;
        const R_h2_c = res.h2_c > 0 ? (1 / res.h2_c) : 0;
        const R_w_c = res.R_wall_c || 0;
        const total_c = R_h1_c + R_w_c + R_h2_c + R_d;

        if (total_c > 0) {
            pct_h1_c = (R_h1_c / total_c) * 100;
            pct_w_c = (R_w_c / total_c) * 100;
            pct_h2_c = (R_h2_c / total_c) * 100;
            pct_d_c = (R_d / total_c) * 100;
        }
    }

    if (config.coilActive) {
        heatResistChart.data.labels = ['壁(ｼﾞｬｹｯﾄ)', 'コイル'];
        heatResistChart.data.datasets[0].data = [pct_h1_j, pct_h1_c];
        heatResistChart.data.datasets[1].data = [pct_w_j, pct_w_c];
        heatResistChart.data.datasets[2].data = [pct_h2_j, pct_h2_c];
        heatResistChart.data.datasets[3].data = [pct_d_j, pct_d_c];
    } else {
        heatResistChart.data.labels = ['壁(ｼﾞｬｹｯﾄ)'];
        heatResistChart.data.datasets[0].data = [pct_h1_j];
        heatResistChart.data.datasets[1].data = [pct_w_j];
        heatResistChart.data.datasets[2].data = [pct_h2_j];
        heatResistChart.data.datasets[3].data = [pct_d_j];
    }

    heatResistChart.update();
}


