const SAVE_KEY = 'paintSheep_save';

export async function saveProgress(data) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export async function loadProgress() {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? JSON.parse(s) : null;
}

export async function submitStageScore(stage, perfectCount) {
    const prev = parseInt(localStorage.getItem('paintSheep_bestStage')) || 0;
    if (stage > prev) {
        localStorage.setItem('paintSheep_bestStage', stage);
    }
    localStorage.setItem('paintSheep_perfectCount', perfectCount);
}

export async function resetScore() {
    localStorage.setItem('paintSheep_bestStage', 0);
    localStorage.setItem('paintSheep_perfectCount', 0);
}

export async function submitMegaScore(megaStageNum, score) {
    const key = `mega_${megaStageNum}`;
    const prev = parseInt(localStorage.getItem(key)) || 0;
    if (score > prev) {
        localStorage.setItem(key, score);
    }
}

export async function loadMegaScore(megaStageNum) {
    const key = `mega_${megaStageNum}`;
    return parseInt(localStorage.getItem(key)) || 0;
}
