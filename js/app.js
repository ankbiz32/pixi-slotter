import { serverData } from "./server.js";

const app = new PIXI.Application({ background: 'white', resizeTo: window });
globalThis.__PIXI_APP__ = app;
app.renderer.view.style.position = 'absolute';
document.body.appendChild(app.view);

// Add play text
const style = new PIXI.TextStyle({
    fontFamily: 'Helvetica',
    fontSize: 30,
    fill: "black",
    stroke: 'black',
    strokeThickness: 1,
    wordWrap: true,
    wordWrapWidth: 440,
});

PIXI.Assets.addBundle('syms', {
    symbol0: 'assets/symbols/symbol_00.json',
    symbol1: 'assets/symbols/symbol_01.json',
    symbol2: 'assets/symbols/symbol_02.json',
    symbol3: 'assets/symbols/symbol_03.json',
    symbol4: 'assets/symbols/symbol_04.json',
    symbol5: 'assets/symbols/symbol_05.json',
  });

const loadingText = new PIXI.Text('LOADING...', style);
loadingText.anchor.set(0.5, 0.5);
loadingText.x = window.innerWidth / 2;
loadingText.y = window.innerHeight / 2;
app.stage.addChild(loadingText);

(async () => {
    syms = await PIXI.Assets.loadBundle('syms');
    setTimeout(() => {
        loadingText.destroy();
        onAssetsLoaded();
    }, 0);
})();

const REEL_WIDTH = 220;
const SYMBOL_SIZE = 200;
const reelContainer = new PIXI.Container();
const reels = [];
const margin = (app.screen.height - SYMBOL_SIZE * 3) / 2.5;
const top = new PIXI.Graphics();
const bottom = new PIXI.Graphics();
let running = false;
let spinBtn, incBtn, decBtn, stakeText, creditsNum, winNum, response, syms;

const dataModel = {
    stake: 1,
    credits: 1000,
    maxBet: 20,
    minBet: 1
}


// onAssetsLoaded handler builds the example.
function onAssetsLoaded() {
    createBg();
    createReels();
    createTopAndBottom();
    makePlayerConsole();
    subscribeToEvents();

    // Listen for animate update.
    app.ticker.add((delta) => {
        // Update the slots.
        for (let i = 0; i < reels.length; i++) {
            const r = reels[i];
            // Update blur filter y amount based on speed.
            // This would be better if calculated with time in mind also. Now blur depends on frame rate.

            r.blur.blurY = (r.position - r.previousPosition) * 8;
            r.previousPosition = r.position;

            // Update symbol positions on reel.
            for (let j = 0; j < r.symbols.length; j++) {
                const s = r.symbols[j];
                const prevy = s.y;

                s.y = ((r.position + j) % r.symbols.length) * SYMBOL_SIZE - SYMBOL_SIZE;
            }
        }
    });
}

function createBg() {
    const backgroundImg = new PIXI.Sprite(PIXI.Texture.from('assets/textureBg.jpg'));
    backgroundImg.width = window.innerWidth;
    backgroundImg.height = window.innerHeight;
    app.stage.addChild(backgroundImg);
}

function createReels() {

    let ctr = 0;
    for (let i = 0; i < 5; i++) {
        ctr = 0;
        const rc = new PIXI.Container();

        rc.x = i * REEL_WIDTH + 90;
        rc.y = 110;
        reelContainer.addChild(rc);

        const reel = {
            container: rc,
            symbols: [],
            position: 0,
            previousPosition: 0,
            blur: new PIXI.filters.BlurFilter(),
        };

        reel.blur.blurX = 0;
        reel.blur.blurY = 0;
        rc.filters = [reel.blur];

        // Build the symbols
        for (let j = 0; j < 5; j++) {
            ctr++;
            const keys = Object.keys(syms)
            const prop = keys[Math.floor(Math.random() * keys.length)];
            const symbol = new PIXI.spine.Spine(syms[prop].spineData);
            var extractedNum = prop.replace('symbol','');
            symbol.symId = Number(extractedNum);
            symbol.y = (j * SYMBOL_SIZE) - 0;
            console.log(symbol);
            symbol.scale.x = symbol.scale.y = Math.min(SYMBOL_SIZE / symbol.width, SYMBOL_SIZE / symbol.height) - 0.2;
            reel.symbols.push(symbol);
            rc.addChild(symbol);
        }
        reels.push(reel);
    }
    app.stage.addChild(reelContainer);


    reelContainer.y = margin + 20;
    reelContainer.x = (app.screen.width - reelContainer.width) / 2;
    // reelContainer.height = SYMBOL_SIZE * 3 + margin + 53

    const mask = new PIXI.Graphics();
    mask.beginFill(0x00000);
    mask.drawRect(reelContainer.x, reelContainer.y - 20, reelContainer.width, SYMBOL_SIZE * 3 + 120);
    mask.endFill();
    reelContainer.mask = mask;
}

function createTopAndBottom() {
    top.beginFill("#00000000", 1);
    top.drawRect(0, 0, app.screen.width, margin);

    bottom.beginFill(0, 1);
    bottom.drawRect(0, app.screen.height - 70, app.screen.width, margin + 30);

    // Add play text
    const headerStyle = new PIXI.TextStyle({
        fontFamily: 'Helvetica',
        fontSize: 30,
        fill: "white",
    });


    // Add header text
    const headerText = new PIXI.Text('FRUIT SLOTTER', headerStyle);

    headerText.x = Math.round((top.width - headerText.width) / 2);
    headerText.y = Math.round((margin - headerText.height) / 2);
    top.addChild(headerText);

    app.stage.addChild(top);
    app.stage.addChild(bottom);
}

function makePlayerConsole() {
    spinBtn = new PIXI.Sprite(PIXI.Texture.from('assets/spin.png'));
    spinBtn.scale.set(0.35, 0.35);
    spinBtn.anchor.set(0.5, 0.5);
    spinBtn.x = window.innerWidth - 100;
    spinBtn.y = window.innerHeight - 70;
    spinBtn.eventMode = "static";
    spinBtn.cursor = "pointer";
    app.stage.addChild(spinBtn);

    spinBtn.on('pointerdown', () => {
        startPlay();
    });

    spinBtn.on('mouseover', () => {
        spinBtn.rotation = -0.3;
    });

    spinBtn.on('mouseout', () => {
        spinBtn.rotation = 0;
    });


    // Add Bet text
    const stakeStyle = new PIXI.TextStyle({
        fontFamily: 'Helvetica',
        fontSize: 20,
        fill: "white",
    });

    // Add Credits text
    let creditsLabel = new PIXI.Text(`CREDITS: `, stakeStyle);
    creditsLabel.position.set(100, window.innerHeight - 40);
    app.stage.addChild(creditsLabel);

    creditsNum = new PIXI.Text(`$${dataModel.credits}`, stakeStyle);
    creditsNum.position.set(creditsLabel.x + creditsLabel.width + 5, window.innerHeight - 40);
    app.stage.addChild(creditsNum);


    // Add Winning text
    let winningLabel = new PIXI.Text(`WINNING: `, stakeStyle);
    winningLabel.position.set(creditsNum.x + creditsNum.width + 150, window.innerHeight - 40);
    app.stage.addChild(winningLabel);

    winNum = new PIXI.Text(`$0`, stakeStyle);
    winNum.position.set(winningLabel.x + winningLabel.width + 5, window.innerHeight - 40);
    app.stage.addChild(winNum);

    // Add Stakes text
    let stakeLableText = new PIXI.Text(`STAKES`, stakeStyle);
    stakeLableText.position.set(winNum.x + winNum.width + 150, window.innerHeight - 45);
    app.stage.addChild(stakeLableText);
    
    decBtn = new PIXI.Text(`-`, stakeStyle);
    decBtn.position.set(stakeLableText.x + stakeLableText.width + 20, window.innerHeight - 45);
    app.stage.addChild(decBtn);

    decBtn.eventMode = "static";
    decBtn.cursor = "pointer";
    decBtn.on('pointerdown', () => {
        dataModel.stake > dataModel.minBet && dataModel.stake--;
        updateStake();
    });

    stakeText = new PIXI.Text(`$${dataModel.stake}`, stakeStyle);
    stakeText.position.set(decBtn.x + decBtn.width + 15, window.innerHeight - 45);
    app.stage.addChild(stakeText);

    incBtn = new PIXI.Text(`+`, stakeStyle);
    incBtn.position.set(stakeText.x + stakeText.width + 9, window.innerHeight - 45);
    app.stage.addChild(incBtn);

    incBtn.eventMode = "static";
    incBtn.cursor = "pointer";
    incBtn.on('pointerdown', () => {
        dataModel.stake < dataModel.maxBet && dataModel.stake++;
        updateStake();
    });


}

function updateStake() {
    stakeText.text = `$${dataModel.stake}`;
}

// Function to start playing.
function startPlay() {
    updateWinning(true);
    enableSpinBtn(false);
    if (running) return;
    running = true;
    response = getResponse();
    updateCredits(false);

    for (let i = 0; i < reels.length; i++) {
        const r = reels[i];
        const extra = Math.floor(Math.random() * 3);
        const target = r.position + 10 + i * 5 + extra;
        const time = 2500 + i * 600 + extra * 600;

        tweenTo(r, 'position', target, time, backout(0.6), null, i === reels.length - 1 ? reelsComplete : null);
    }
}

function updateCredits(hasWinning = false) {
    if (hasWinning) {
        dataModel.credits += response.results.win;
    } else {
        dataModel.credits -= dataModel.stake;
    }
    creditsNum.text = `$${dataModel.credits}`;
}

function updateWinning(reset = false) {
    if (reset) {
        winNum.text = `$0`;
    } else {
        winNum.text = `$${response.results.win}`;
        updateCredits(true);
    }
}

function subscribeToEvents() {
    document.addEventListener('keydown', (key) => {
        if (key.code === "Space" || key.code === "Enter" || key.code === "NumpadEnter") {
            startPlay();
        }
    })
}

// Reels done handler.
function reelsComplete() {
    running = false;
    enableSpinBtn(true);
    if (response.results.win) {
        updateWinning();
        animateWinningSymbols();
    }
}

function animateWinningSymbols() {
    reels.forEach((reel, i) => {
        let winningSymId = response.results.symbolIDs[i]
        reel.symbols.forEach((sym) => {
            if(sym.symId === winningSymId)
            sym.state.setAnimation(0, 'win', false)
        })
    })
}

function enableSpinBtn(enable = true) {
    if (enable) {
        spinBtn.alpha = 1;
        spinBtn.cursor = "pointer";
    } else {
        spinBtn.alpha = 0.5;
        spinBtn.cursor = "disable";

    }
}

function getResponse() {
    let res = serverData[(Math.floor(Math.random() * serverData.length))].response;
    console.log(res)
    return (res);
}

// Very simple tweening utility function. This should be replaced with a proper tweening library in a real product.
const tweening = [];

function tweenTo(object, property, target, time, easing, onchange, oncomplete) {
    const tween = {
        object,
        property,
        propertyBeginValue: object[property],
        target,
        easing,
        time,
        change: onchange,
        complete: oncomplete,
        start: Date.now(),
    };

    tweening.push(tween);

    return tween;
}
// Listen for animate update.
app.ticker.add((delta) => {
    const now = Date.now();
    const remove = [];

    for (let i = 0; i < tweening.length; i++) {
        const t = tweening[i];
        const phase = Math.min(1, (now - t.start) / t.time);

        t.object[t.property] = lerp(t.propertyBeginValue, t.target, t.easing(phase));
        if (t.change) t.change(t);
        if (phase === 1) {
            t.object[t.property] = t.target;
            if (t.complete) t.complete(t);
            remove.push(t);
        }
    }
    for (let i = 0; i < remove.length; i++) {
        tweening.splice(tweening.indexOf(remove[i]), 1);
    }
});

// Basic lerp funtion.
function lerp(a1, a2, t) {
    return a1 * (1 - t) + a2 * t;
}

// Backout function from tweenjs.
function backout(amount) {
    return (t) => (--t * t * ((amount + 1) * t + amount) + 1);
}
