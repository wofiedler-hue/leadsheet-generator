// --- Constants ---
const BAR_SYMBOLS = { '|': 'single', '||': 'double', '|||': 'final', '>|': 'end', '}': 'end', '|<': 'start-repeat' };
const SYMBOL_LOOKUP = {
    'single': '|',
    'double': '||',
    'final': '|||',
    'end': '>|',
    'start-repeat': '|<'
};

const GOOGLE_FONTS = [
    { name: 'Times New Roman', family: "'Times New Roman', Times, serif" },
    { name: 'Merriweather', family: "'Merriweather', serif" },
    { name: 'Roboto', family: "'Roboto', sans-serif" },
    { name: 'Playfair Display', family: "'Playfair Display', serif" },
    { name: 'Dancing Script', family: "'Dancing Script', cursive" },
    { name: 'Caveat', family: "'Caveat', cursive" },
];

// State Object - Single Source of Truth
const state = {
  sheetData: {
    title: 'Titel',
    titleFont: { family: "'Times New Roman', Times, serif", size: 40 },
    subtitle: 'Untertitel',
    subtitleFont: { family: "'Times New Roman', Times, serif", size: 19 },
    style: 'Stil',
    styleFont: { family: "'Times New Roman', Times, serif", size: 19 },
    timeSignature: '4/4',
    lines: [
      {
        lineText: '<Zeilentext',
        startBar: 'single',
        measures: [
          { beats: ['', '', '', ''], barLine: 'single', volta: '', rehearsalMark: '' },
          { beats: ['', '', '', ''], barLine: 'single', volta: '', rehearsalMark: '' },
          { beats: ['', '', '', ''], barLine: 'single', volta: '', rehearsalMark: '' },
          { beats: ['', '', '', ''], barLine: 'final', volta: '', rehearsalMark: '' }
        ],
      }
    ]
  },
  editing: null,
  isExporting: false,
};

// DOM Element References
const dom = {
  exportButton: document.getElementById('export-png-btn'),
  printPdfButton: document.getElementById('print-pdf-btn'),
  addLineButton: document.getElementById('add-line-btn'),
  sheetMusicContainer: document.getElementById('sheet-music'),
  sheetPanel: document.querySelector('.sheet-panel'),
  appContainer: document.querySelector('.app-container'),
  helpButton: document.getElementById('help-btn'),
  helpModal: document.getElementById('help-modal'),
  modalCloseButton: document.getElementById('modal-close-btn'),
  headerToolbar: document.getElementById('header-editor-toolbar'),
  fontFamilySelect: document.getElementById('font-family-select'),
  fontSizeInput: document.getElementById('font-size-input'),
};

// --- HELPERS ---
const getBeatsPerMeasure = () => {
    const [beats] = String(state.sheetData.timeSignature).split('/').map(s => parseInt(s, 10));
    return !isNaN(beats) && beats > 0 ? beats : 4;
};

// --- RENDERING LOGIC ---
const createChordElement = (chord) => {
    const chordDisplay = document.createElement('div');
    chordDisplay.className = 'chord-display';
    if (!chord) return chordDisplay;

    if (chord.trim() === '/') {
        const slash = document.createElement('span');
        slash.className = 'beat-slash';
        slash.textContent = '\uD834\uDD0D'; // MUSICAL SYMBOL REPEAT SIGN (U+1D10D)
        return slash;
    }

    const [mainChordStr, bassNote] = chord.split('/');
    const mainSpan = document.createElement('span');
    mainSpan.className = 'chord-main';

    const match = mainChordStr.match(/^([A-G])([#b]?)(.*)/);
    if (!match) {
        mainSpan.textContent = mainChordStr;
    } else {
        const [, rootNote, accidental, extension] = match;
        
        const rootSpan = document.createElement('span');
        if (bassNote) {
            rootSpan.className = 'chord-root-slash';
        }
        rootSpan.textContent = rootNote;
        mainSpan.appendChild(rootSpan);

        if (accidental) {
            const accidentalSpan = document.createElement('span');
            accidentalSpan.className = 'chord-accidental';
            let musicalSymbol = accidental;
            if (accidental === '#') {
                musicalSymbol = '♯';
            } else if (accidental === 'b') {
                musicalSymbol = '♭';
                accidentalSpan.classList.add('is-flat');
            }
            accidentalSpan.textContent = musicalSymbol;
            mainSpan.appendChild(accidentalSpan);
        }
        if (extension) {
            const extSpan = document.createElement('span');
            extSpan.className = 'chord-extension';
            if (bassNote) {
                extSpan.classList.add('is-slash-extension');
            }
            extSpan.textContent = extension;
            mainSpan.appendChild(extSpan);
        }
    }
    chordDisplay.appendChild(mainSpan);

    if (bassNote) {
        const slashSeparator = document.createElement('span');
        slashSeparator.textContent = '/';
        chordDisplay.appendChild(slashSeparator);

        const bassSpan = document.createElement('span');
        bassSpan.className = 'chord-bass';
        bassSpan.textContent = bassNote;
        chordDisplay.appendChild(bassSpan);
    }
    return chordDisplay;
};

const applyFontStyles = (element, fontData) => {
    element.style.fontFamily = fontData.family;
    element.style.fontSize = `${fontData.size}px`;
};

const renderSheet = () => {
    dom.sheetMusicContainer.innerHTML = '';
    const data = state.sheetData;
    const beatsPerMeasure = getBeatsPerMeasure();
    
    // Manage Header Toolbar
    dom.headerToolbar.classList.add('hidden');
    if (state.editing?.type === 'header') {
        const part = state.editing.part;
        const fontData = data[`${part}Font`];
        if (fontData) {
            dom.fontFamilySelect.value = fontData.family;
            dom.fontSizeInput.value = String(fontData.size);
            dom.headerToolbar.classList.remove('hidden');
        }
    }

    // --- Render Header ---
    const header = document.createElement('div');
    header.className = 'sheet-header';
    
    const isEditingTitle = state.editing?.type === 'header' && state.editing.part === 'title';
    const titleEl = isEditingTitle ? document.createElement('input') : document.createElement('h1');
    applyFontStyles(titleEl, data.titleFont);
    if (isEditingTitle) {
        titleEl.type = 'text';
        titleEl.value = data.title;
        titleEl.className = 'header-input title-input';
    } else {
        titleEl.textContent = data.title;
    }
    titleEl.dataset.part = 'title';
    header.appendChild(titleEl);
    
    const secondLine = document.createElement('div');
    secondLine.className = 'header-second-line';
    
    const isEditingStyle = state.editing?.type === 'header' && state.editing.part === 'style';
    const styleEl = isEditingStyle ? document.createElement('input') : document.createElement('div');
    applyFontStyles(styleEl, data.styleFont);
    if (isEditingStyle) {
        styleEl.type = 'text';
        styleEl.value = data.style;
        styleEl.className = 'header-input';
        styleEl.style.fontFamily = data.styleFont.family;
    } else {
        styleEl.textContent = data.style;
        styleEl.className = 'style-info';
    }
    styleEl.dataset.part = 'style';
    secondLine.appendChild(styleEl);

    const isEditingSubtitle = state.editing?.type === 'header' && state.editing.part === 'subtitle';
    const subtitleEl = isEditingSubtitle ? document.createElement('input') : document.createElement('div');
    applyFontStyles(subtitleEl, data.subtitleFont);
    if (isEditingSubtitle) {
        subtitleEl.type = 'text';
        subtitleEl.value = data.subtitle;
        subtitleEl.className = 'header-input subtitle-input';
        subtitleEl.style.fontFamily = data.subtitleFont.family;
    } else {
        subtitleEl.textContent = data.subtitle;
        subtitleEl.className = 'subtitle-info';
    }
    subtitleEl.dataset.part = 'subtitle';
    secondLine.appendChild(subtitleEl);

    header.appendChild(secondLine);
    dom.sheetMusicContainer.appendChild(header);

    // --- Render Body ---
    const sheetBody = document.createElement('div');
    sheetBody.className = 'sheet-body';

    const isEditingTime = state.editing?.type === 'timeSignature';
    const timeEl = document.createElement('div');
    timeEl.className = 'time-signature';
    if(isEditingTime) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = data.timeSignature;
        input.className = 'time-signature-input';
        timeEl.appendChild(input);
    } else {
        const [num, den] = data.timeSignature.split('/');
        timeEl.innerHTML = `<span>${num || ''}</span><span>${den || ''}</span>`;
    }
    sheetBody.appendChild(timeEl);
    
    const measuresContainer = document.createElement('div');
    measuresContainer.className = 'measures-container';
    data.lines.forEach((lineData, lineIndex) => {
        const lineWrapper = document.createElement('div');
        lineWrapper.className = 'line-wrapper';

        // --- Render Line Text ---
        const isEditingLineText = state.editing?.type === 'lineText' && state.editing.lineIndex === lineIndex;
        const lineTextContainer = document.createElement('div');
        lineTextContainer.className = 'line-text-container';
        lineTextContainer.dataset.lineIndex = String(lineIndex);
        if (isEditingLineText) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'line-text-input';
            input.value = lineData.lineText || '';
            lineTextContainer.appendChild(input);
        } else {
            const display = document.createElement('div');
            display.className = 'line-text-display';
            
            const rawText = lineData.lineText || '';
            let textToParse = rawText;
            let alignment = 'align-center'; 

            if (rawText.startsWith('<')) {
                textToParse = rawText.substring(1);
                alignment = 'align-left';
            } else if (rawText.startsWith('>')) {
                textToParse = rawText.substring(1);
                alignment = 'align-right';
            }
            
            display.classList.add(alignment);

            // Improved logic for musical symbols
            const fragments = textToParse.split(/(D\\.S\\.|D\\.C\\.|Coda|\\$)/ig);

            fragments.forEach(fragment => {
                if (!fragment) return; // Skip empty strings
                
                const lowerFragment = fragment.toLowerCase().trim();
                let symbolSpan;

                switch (lowerFragment) {
                    case '$':
                        symbolSpan = document.createElement('span');
                        symbolSpan.className = 'musical-symbol segno-symbol';
                        symbolSpan.textContent = '\uD834\uDD0B'; // U+1D10B (Segno)
                        display.appendChild(symbolSpan);
                        break;
                    case 'coda':
                        symbolSpan = document.createElement('span');
                        symbolSpan.className = 'musical-symbol coda-symbol';
                        symbolSpan.textContent = '\uD834\uDD0C'; // U+1D10C (Coda)
                        display.appendChild(symbolSpan);
                        break;
                    case 'd.s.':
                        symbolSpan = document.createElement('span');
                        symbolSpan.className = 'musical-symbol ds-symbol';
                        symbolSpan.textContent = '\uD834\uDD09'; // U+1D109 (Dal Segno)
                        display.appendChild(symbolSpan);
                        break;
                    case 'd.c.':
                        symbolSpan = document.createElement('span');
                        symbolSpan.className = 'musical-symbol dc-symbol';
                        symbolSpan.textContent = '\uD834\uDD0A'; // U+1D10A (Da Capo)
                        display.appendChild(symbolSpan);
                        break;
                    default:
                        display.appendChild(document.createTextNode(fragment));
                }
            });
            lineTextContainer.appendChild(display);
        }
        lineWrapper.appendChild(lineTextContainer);
        
        const lineEl = document.createElement('div');
        lineEl.className = 'measure-line';

        // --- Render Start Bar ---
        const isEditingStartBar = state.editing?.type === 'startBar' && state.editing.lineIndex === lineIndex;
        const startBarContainer = document.createElement('div');
        startBarContainer.className = 'bar-line-container';
        startBarContainer.dataset.lineIndex = String(lineIndex);
        startBarContainer.dataset.type = 'startBar';

        if (isEditingStartBar) {
            const barInput = document.createElement('input');
            barInput.type = 'text';
            barInput.className = 'bar-line-input';
            barInput.value = SYMBOL_LOOKUP[lineData.startBar] || '|';
            startBarContainer.appendChild(barInput);
        } else {
            const barLineEl = document.createElement('div');
            barLineEl.classList.add('bar-line-display', `bar-${lineData.startBar}`);
            if (lineData.startBar === 'start-repeat') {
                barLineEl.innerHTML = '<div class="start-repeat-dots">:</div>';
            }
            startBarContainer.appendChild(barLineEl);
        }
        lineEl.appendChild(startBarContainer);

        // --- Render Measures and their following Bar Lines ---
        lineData.measures.forEach((measure, measureIndex) => {
            const isEditingMeasure = state.editing?.type === 'measure' && state.editing.lineIndex === lineIndex && state.editing.measureIndex === measureIndex;
            const measureEl = document.createElement('div');
            measureEl.className = 'measure';
            measureEl.dataset.lineIndex = String(lineIndex);
            measureEl.dataset.measureIndex = String(measureIndex);
            
            // Add measure delete button
            if (lineData.measures.length > 1) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'measure-delete-btn';
                deleteBtn.textContent = '×';
                deleteBtn.dataset.lineIndex = String(lineIndex);
                deleteBtn.dataset.measureIndex = String(measureIndex);
                deleteBtn.setAttribute('aria-label', `Takt ${measureIndex + 1} löschen`);
                measureEl.appendChild(deleteBtn);
            }

            // --- Rehearsal Mark Logic ---
            const isEditingRehearsalMark = state.editing?.type === 'rehearsalMark' && state.editing.lineIndex === lineIndex && state.editing.measureIndex === measureIndex;
            if (isEditingRehearsalMark || measure.rehearsalMark) {
                const rehearsalContainer = document.createElement('div');
                rehearsalContainer.className = 'rehearsal-mark-container';
                rehearsalContainer.dataset.lineIndex = String(lineIndex);
                rehearsalContainer.dataset.measureIndex = String(measureIndex);
                if (isEditingRehearsalMark) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'rehearsal-mark-input';
                    input.value = measure.rehearsalMark || '';
                    rehearsalContainer.appendChild(input);
                } else {
                    const display = document.createElement('div');
                    display.className = 'rehearsal-mark';
                    display.textContent = measure.rehearsalMark;
                    rehearsalContainer.appendChild(display);
                }
                measureEl.appendChild(rehearsalContainer);
            }
            
            // --- Volta Bracket Logic ---
            const isEditingVolta = state.editing?.type === 'volta' && state.editing.lineIndex === lineIndex && state.editing.measureIndex === measureIndex;
            const voltaContainer = document.createElement('div');
            voltaContainer.className = 'volta-container';
            voltaContainer.dataset.lineIndex = String(lineIndex);
            voltaContainer.dataset.measureIndex = String(measureIndex);

            if (measure.rehearsalMark) {
                voltaContainer.style.marginBottom = '45px';
            }

            if (isEditingVolta) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'volta-input';
                input.value = measure.volta || '';
                voltaContainer.appendChild(input);
            } else if (measure.volta) {
                const display = document.createElement('div');
                display.className = 'volta-display';

                const prevMeasure = measureIndex > 0 ? lineData.measures[measureIndex - 1] : null;
                const nextMeasure = measureIndex < lineData.measures.length - 1 ? lineData.measures[measureIndex + 1] : null;

                const startsHere = !prevMeasure || prevMeasure.volta !== measure.volta;
                const endsHere = !nextMeasure || nextMeasure.volta !== measure.volta;

                const line = document.createElement('div');
                line.className = 'volta-line';
                if (startsHere) line.classList.add('starts-here'); else line.classList.add('continues');
                if (endsHere) line.classList.add('ends-here'); else line.classList.add('continues-past');
                display.appendChild(line);

                if (startsHere) {
                    const startHook = document.createElement('div');
                    startHook.className = 'volta-hook volta-start-hook';
                    display.appendChild(startHook);

                    const text = document.createElement('div');
                    text.className = 'volta-text';
                    text.textContent = measure.volta;
                    display.appendChild(text);
                }

                if (endsHere) {
                    const endHook = document.createElement('div');
                    endHook.className = 'volta-hook volta-end-hook';
                    display.appendChild(endHook);
                }
                voltaContainer.appendChild(display);
            }
            measureEl.appendChild(voltaContainer);
            
            if (isEditingMeasure) {
                const editorEl = document.createElement('div');
                editorEl.className = 'measure-editor';
                for (let i = 0; i < beatsPerMeasure; i++) {
                    const beat = measure.beats[i] || '';
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'beat-input';
                    input.value = beat;
                    input.dataset.beatIndex = String(i);
                    editorEl.appendChild(input);
                }
                measureEl.appendChild(editorEl);
            } else {
                const isLazyMeasure = measure.beats.some(b => b.trim() === '%');

                if (isLazyMeasure) {
                    const lazyContainer = document.createElement('div');
                    lazyContainer.className = 'lazy-symbol-container';
                    
                    const lazySymbol = document.createElement('span');
                    lazySymbol.className = 'lazy-symbol';
                    lazySymbol.textContent = '\uD834\uDD0E'; // MUSICAL SYMBOL MEASURE REPEAT (U+1D10E)

                    lazyContainer.appendChild(lazySymbol);
                    measureEl.appendChild(lazyContainer);
                } else {
                  const beatsDisplay = document.createElement('div');
                  beatsDisplay.className = 'beats-display';
                  for (let i = 0; i < beatsPerMeasure; i++) {
                      const beat = measure.beats[i] || '';
                      const slot = document.createElement('div');
                      slot.className = 'beat-slot';
                      if (beat) slot.appendChild(createChordElement(beat));
                      beatsDisplay.appendChild(slot);
                  }
                  measureEl.appendChild(beatsDisplay);
                }
            }
            lineEl.appendChild(measureEl);
        
            // --- Render Bar Line After Measure ---
            const isEditingBar = state.editing?.type === 'barLine' && state.editing.lineIndex === lineIndex && state.editing.measureIndex === measureIndex;
            const barLineContainer = document.createElement('div');
            barLineContainer.className = 'bar-line-container';
            barLineContainer.dataset.lineIndex = String(lineIndex);
            barLineContainer.dataset.measureIndex = String(measureIndex);
            
            if (isEditingBar) {
               const barInput = document.createElement('input');
               barInput.type = 'text';
               barInput.className = 'bar-line-input';
               barInput.value = SYMBOL_LOOKUP[measure.barLine] || '|';
               barLineContainer.appendChild(barInput);
            } else {
               const barLineEl = document.createElement('div');
               barLineEl.classList.add('bar-line-display', `bar-${measure.barLine}`);
               if (measure.barLine === 'start-repeat') {
                   barLineEl.innerHTML = '<div class="start-repeat-dots">:</div>';
               }
               barLineContainer.appendChild(barLineEl);
            }
            lineEl.appendChild(barLineContainer);
        });

        // --- Render Add Measure Button ---
        if (lineData.measures.length < 4) {
            const addMeasureBtn = document.createElement('button');
            addMeasureBtn.className = 'add-measure-btn';
            addMeasureBtn.textContent = '+';
            addMeasureBtn.dataset.lineIndex = String(lineIndex);
            addMeasureBtn.setAttribute('aria-label', 'Takt hinzufügen');
            lineEl.appendChild(addMeasureBtn);
        }
        
        // Add line delete button if there is more than one line
        if (state.sheetData.lines.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'line-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.dataset.lineIndex = String(lineIndex);
            deleteBtn.setAttribute('aria-label', `Zeile ${lineIndex + 1} löschen`);
            lineEl.appendChild(deleteBtn);
        }
        
        lineWrapper.appendChild(lineEl);
        measuresContainer.appendChild(lineWrapper);
    });
    sheetBody.appendChild(measuresContainer);
    dom.sheetMusicContainer.appendChild(sheetBody);

    if (state.editing) {
        let selector;
        const { type, part, lineIndex, measureIndex } = state.editing;

        switch (type) {
            case 'header':
                selector = `.sheet-header [data-part="${part}"].header-input`;
                break;
            case 'timeSignature':
                selector = '.time-signature-input';
                break;
            case 'measure':
                selector = `.measure[data-line-index="${lineIndex}"][data-measure-index="${measureIndex}"] .beat-input`;
                break;
            case 'barLine':
                selector = `.bar-line-container[data-line-index="${lineIndex}"][data-measure-index="${measureIndex}"] .bar-line-input`;
                break;
            case 'startBar':
                selector = `.bar-line-container[data-line-index="${lineIndex}"][data-type="startBar"] .bar-line-input`;
                break;
            case 'rehearsalMark':
                selector = `.rehearsal-mark-container[data-line-index="${lineIndex}"][data-measure-index="${measureIndex}"] .rehearsal-mark-input`;
                break;
            case 'volta':
                selector = `.volta-container[data-line-index="${lineIndex}"][data-measure-index="${measureIndex}"] .volta-input`;
                break;
            case 'lineText':
                selector = `.line-text-container[data-line-index="${lineIndex}"] .line-text-input`;
                break;
        }

        if (selector) {
            const activeInput = dom.sheetMusicContainer.querySelector(selector);
            if (activeInput) {
                activeInput.focus();
                if (activeInput.type === 'text') {
                    activeInput.select();
                }
            }
        }
    }
};

// --- MODAL HANDLERS ---
const openHelpModal = () => {
    dom.helpModal.classList.remove('hidden');
};

const closeHelpModal = () => {
    dom.helpModal.classList.add('hidden');
};

// --- EVENT HANDLERS ---

const handleAddMeasure = (lineIndex) => {
    const line = state.sheetData.lines[lineIndex];
    if (!line || line.measures.length >= 4) return;

    const isLastLineOfSheet = lineIndex === state.sheetData.lines.length - 1;

    // The current last measure is no longer the last in the line.
    // If it had a 'final' bar, it should be changed to 'single'.
    if (line.measures.length > 0) {
        const lastMeasure = line.measures[line.measures.length - 1];
        if (lastMeasure.barLine === 'final') {
            lastMeasure.barLine = 'single';
        }
    }

    const beatsPerMeasure = getBeatsPerMeasure();
    const newBeats = Array(beatsPerMeasure).fill('');
    
    const newMeasure = {
        beats: newBeats,
        volta: '',
        rehearsalMark: '',
        // The new measure is the last in this line.
        // It gets a 'final' bar only if it's the last line of the whole sheet.
        barLine: isLastLineOfSheet ? 'final' : 'single'
    };

    line.measures.push(newMeasure);
    
    state.editing = null;
    renderSheet();
};

const handleSheetClick = (e) => {
    // If the mousedown is inside an already-active input or editor,
    // do nothing. This allows for normal input interactions like
    // text selection and prevents re-rendering, which stops the page jump.
    if (e.target.tagName === 'INPUT' || e.target.closest('.measure-editor')) {
        return;
    }
    
    e.stopPropagation();
    const target = e.target;
    let newEditingState = null;

    const addMeasureBtn = target.closest('.add-measure-btn');
    if (addMeasureBtn) {
        const lineIndex = parseInt(addMeasureBtn.dataset.lineIndex, 10);
        handleAddMeasure(lineIndex);
        return;
    }

    const measureDeleteBtn = target.closest('.measure-delete-btn');
    if (measureDeleteBtn) {
        const lineIndex = parseInt(measureDeleteBtn.dataset.lineIndex, 10);
        const measureIndex = parseInt(measureDeleteBtn.dataset.measureIndex, 10);
        if (!isNaN(lineIndex) && !isNaN(measureIndex)) {
            const line = state.sheetData.lines[lineIndex];
            if (line && line.measures.length > 1) {
                const wasLastMeasureInLine = measureIndex === line.measures.length - 1;
                
                line.measures.splice(measureIndex, 1);

                // If we deleted the last measure of the line, the new last measure needs its bar line updated.
                if (wasLastMeasureInLine && line.measures.length > 0) {
                    const isLastLineOfSheet = lineIndex === state.sheetData.lines.length - 1;
                    line.measures[line.measures.length - 1].barLine = isLastLineOfSheet ? 'final' : 'single';
                }
                
                state.editing = null;
                renderSheet();
            }
        }
        return;
    }

    const deleteBtn = target.closest('.line-delete-btn');
    if (deleteBtn) {
        const lineIndex = parseInt(deleteBtn.dataset.lineIndex, 10);
        if (!isNaN(lineIndex) && state.sheetData.lines.length > 1) {
            state.sheetData.lines.splice(lineIndex, 1);
            state.editing = null;
            renderSheet();
        }
        return; 
    }
    
    const lineTextContainer = target.closest('.line-text-container');
    const voltaContainer = target.closest('.volta-container');
    const rehearsalMarkContainer = target.closest('.rehearsal-mark-container');
    const measureEl = target.closest('.measure');
    const barEl = target.closest('.bar-line-container');
    const headerEl = target.closest('.sheet-header [data-part]');
    const timeEl = target.closest('.time-signature');

    if (lineTextContainer) {
        newEditingState = { type: 'lineText', lineIndex: parseInt(lineTextContainer.dataset.lineIndex) };
    } else if (voltaContainer) {
        newEditingState = { type: 'volta', lineIndex: parseInt(voltaContainer.dataset.lineIndex), measureIndex: parseInt(voltaContainer.dataset.measureIndex) };
    } else if (rehearsalMarkContainer) {
        newEditingState = { type: 'rehearsalMark', lineIndex: parseInt(rehearsalMarkContainer.dataset.lineIndex), measureIndex: parseInt(rehearsalMarkContainer.dataset.measureIndex) };
    } else if (measureEl) {
        newEditingState = { type: 'measure', lineIndex: parseInt(measureEl.dataset.lineIndex), measureIndex: parseInt(measureEl.dataset.measureIndex) };
    } else if (barEl) {
        if (barEl.dataset.type === 'startBar') {
            newEditingState = { type: 'startBar', lineIndex: parseInt(barEl.dataset.lineIndex) };
        } else {
            newEditingState = { type: 'barLine', lineIndex: parseInt(barEl.dataset.lineIndex), measureIndex: parseInt(barEl.dataset.measureIndex) };
        }
    } else if (headerEl) {
        newEditingState = { type: 'header', part: headerEl.dataset.part };
    } else if (timeEl) {
        newEditingState = { type: 'timeSignature' };
    }
    
    if (JSON.stringify(newEditingState) !== JSON.stringify(state.editing)) {
        state.editing = newEditingState;
        renderSheet();
    }
};

const handleGlobalClick = (e) => {
    const isClickInsideSheet = dom.sheetMusicContainer.contains(e.target);
    const isClickInsideToolbar = dom.headerToolbar.contains(e.target);

    if (!isClickInsideSheet && !isClickInsideToolbar) {
        if (state.editing) {
            state.editing = null;
            renderSheet();
        }
    }
};

const handleInputChange = (e) => {
    const target = e.target;
    if (!state.editing) return;

    switch(state.editing.type) {
        case 'header':
            state.sheetData[state.editing.part] = target.value;
            break;
        case 'timeSignature':
            const oldBeats = getBeatsPerMeasure();
            state.sheetData.timeSignature = target.value;
            const newBeats = getBeatsPerMeasure();
            if (oldBeats !== newBeats) {
                state.sheetData.lines.forEach(line => {
                    line.measures.forEach(measure => {
                        const newBeatsArray = [];
                        for (let i = 0; i < newBeats; i++) {
                            newBeatsArray.push(measure.beats[i] || '');
                        }
                        measure.beats = newBeatsArray;
                    });
                });
            }
            break;
        case 'measure':
            const { lineIndex, measureIndex } = state.editing;
            const beatIndex = parseInt(target.dataset.beatIndex);
            state.sheetData.lines[lineIndex].measures[measureIndex].beats[beatIndex] = target.value;
            break;
        case 'barLine':
            const { lineIndex: blLine, measureIndex: blMeasure } = state.editing;
            const barType = BAR_SYMBOLS[target.value.trim()] || 'single';
            state.sheetData.lines[blLine].measures[blMeasure].barLine = barType;
            break;
        case 'startBar':
            const { lineIndex: sblLine } = state.editing;
            const sblBarType = BAR_SYMBOLS[target.value.trim()] || 'single';
            state.sheetData.lines[sblLine].startBar = sblBarType;
            break;
        case 'rehearsalMark':
            const { lineIndex: rmLine, measureIndex: rmMeasure } = state.editing;
            state.sheetData.lines[rmLine].measures[rmMeasure].rehearsalMark = target.value;
            break;
        case 'volta':
            const { lineIndex: vLine, measureIndex: vMeasure } = state.editing;
            state.sheetData.lines[vLine].measures[vMeasure].volta = target.value;
            // No full render needed on input, but it's simple enough for now
            break;
        case 'lineText':
            const { lineIndex: ltLine } = state.editing;
            state.sheetData.lines[ltLine].lineText = target.value;
            break;
    }
};

const handleToolbarChange = () => {
    if (state.editing?.type !== 'header') return;

    const part = state.editing.part;
    const fontData = state.sheetData[`${part}Font`];
    
    if (fontData) {
        fontData.family = dom.fontFamilySelect.value;
        fontData.size = parseInt(dom.fontSizeInput.value, 10);
        
        const headerEl = dom.sheetMusicContainer.querySelector(`[data-part="${part}"]`);
        if (headerEl) {
           applyFontStyles(headerEl, fontData);
           if (headerEl.tagName === 'INPUT') {
               headerEl.style.fontFamily = fontData.family;
           }
        }
    }
};

const handleAddNewLine = () => {
    const lastLine = state.sheetData.lines[state.sheetData.lines.length - 1];
    
    if (lastLine && lastLine.measures.length > 0) {
        const lastMeasure = lastLine.measures[lastLine.measures.length - 1];
        if (lastMeasure.barLine === 'final') {
            lastMeasure.barLine = 'single';
        }
    }

    const beatsPerMeasure = getBeatsPerMeasure();
    const newBeats = Array(beatsPerMeasure).fill('');

    const newLine = {
        lineText: '',
        startBar: 'single',
        measures: [
            { beats: [...newBeats], barLine: 'single', volta: '', rehearsalMark: '' },
            { beats: [...newBeats], barLine: 'single', volta: '', rehearsalMark: '' },
            { beats: [...newBeats], barLine: 'single', volta: '', rehearsalMark: '' },
            { beats: [...newBeats], barLine: 'final', volta: '' , rehearsalMark: ''}
        ],
    };
    state.sheetData.lines.push(newLine);
    renderSheet();
};

// Improved pagination for better PDF output
const createPaginatedPages = () => {
    const A4_HEIGHT_MM = 297;
    const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * 3.779528); // 96dpi conversion
    const MARGIN_MM = 20;
    const MARGIN_PX = Math.round(MARGIN_MM * 3.779528);
    const FOOTER_HEIGHT_PX = 60;
    const MAX_CONTENT_HEIGHT = A4_HEIGHT_PX - (2 * MARGIN_PX) - FOOTER_HEIGHT_PX;

    const originalSheet = dom.sheetMusicContainer;
    const header = originalSheet.querySelector('.sheet-header');
    const sheetBody = originalSheet.querySelector('.sheet-body');
    const lineElements = Array.from(originalSheet.querySelectorAll('.line-wrapper'));

    if (!header || !sheetBody) return [];

    const pagesContent = [];
    let currentPageLines = [];
    let currentHeight = 0;

    // First page includes header
    let headerHeight = 0;
    if (header) {
        headerHeight = header.offsetHeight + 40; // Add margin
        currentHeight = headerHeight;
    }

    for (let i = 0; i < lineElements.length; i++) {
        const lineElement = lineElements[i];
        const lineHeight = lineElement.offsetHeight + 20; // Add margin

        // Check if adding this line would exceed page height
        if (currentHeight + lineHeight > MAX_CONTENT_HEIGHT && currentPageLines.length > 0) {
            pagesContent.push(currentPageLines);
            currentPageLines = [];
            currentHeight = lineHeight; // Start new page with this line
        } else {
            currentHeight += lineHeight;
        }

        currentPageLines.push(lineElement);
    }

    // Add the last page if any lines are left
    if (currentPageLines.length > 0) {
        pagesContent.push(currentPageLines);
    }

    // Construct the actual page DOM elements
    return pagesContent.map((pageLines, pageIndex) => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'print-page';

        const pageContentWrapper = document.createElement('div');
        pageContentWrapper.className = 'page-content-wrapper';

        if (pageIndex === 0) {
            // First page gets the header
            pageContentWrapper.appendChild(header.cloneNode(true));
            const bodyClone = sheetBody.cloneNode(true);
            const measuresContainer = bodyClone.querySelector('.measures-container');
            if (measuresContainer) {
                measuresContainer.innerHTML = '';
                pageLines.forEach(line => measuresContainer.appendChild(line.cloneNode(true)));
            }
            pageContentWrapper.appendChild(bodyClone);
        } else {
            // Subsequent pages just get measures
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'sheet-body';
            
            const timeSignature = document.createElement('div');
            timeSignature.className = 'time-signature';
            const [num, den] = state.sheetData.timeSignature.split('/');
            timeSignature.innerHTML = `<span>${num || ''}</span><span>${den || ''}</span>`;
            bodyDiv.appendChild(timeSignature);
            
            const measuresContainer = document.createElement('div');
            measuresContainer.className = 'measures-container';
            pageLines.forEach(line => measuresContainer.appendChild(line.cloneNode(true)));
            bodyDiv.appendChild(measuresContainer);
            
            pageContentWrapper.appendChild(bodyDiv);
        }

        pageDiv.appendChild(pageContentWrapper);
        return pageDiv;
    });
};

const handleExportPNG = async () => {
    if (state.isExporting) return;

    if (typeof html2canvas === 'undefined') {
        alert('Fehler: Die Export-Bibliothek (html2canvas) konnte nicht geladen werden. Prüfen Sie Ihre Internetverbindung.');
        return;
    }

    document.body.classList.add('is-exporting');
    state.isExporting = true;
    dom.exportButton.textContent = 'Exportiere...';
    dom.exportButton.disabled = true;

    const previousEditingState = state.editing;
    state.editing = null;
    renderSheet();

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const pageElements = createPaginatedPages();
        const renderContainer = document.createElement('div');
        renderContainer.style.position = 'absolute';
        renderContainer.style.left = '-9999px';
        renderContainer.style.top = '0';
        renderContainer.style.zIndex = '-1';

        pageElements.forEach(page => renderContainer.appendChild(page));
        document.body.appendChild(renderContainer);

        const baseFilename = state.sheetData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'leadsheet';

        for (let i = 0; i < pageElements.length; i++) {
            const pageElement = pageElements[i];

            // Force the element to the full A4 width before rendering
            pageElement.style.width = '794px';

            pageElement.style.height = 'auto';
            pageElement.style.overflow = 'visible';

            const canvas = await html2canvas(pageElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 794, // A4 width at 96dpi
                height: 1123, // A4 height at 96dpi
            });

            const link = document.createElement('a');
            const filename = pageElements.length > 1
                ? `${baseFilename}_seite_${i + 1}.png`
                : `${baseFilename}.png`;
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();

            if (pageElements.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        document.body.removeChild(renderContainer);
    } catch (error) {
        console.error('Error exporting PNG:', error);
        alert('Fehler beim Export. Bitte versuchen Sie es erneut.');
    } finally {
        state.isExporting = false;
        dom.exportButton.textContent = 'Export als PNG';
        dom.exportButton.disabled = false;
        
        document.body.classList.remove('is-exporting');

        state.editing = previousEditingState;
        renderSheet();
    }
};

const handlePrint = () => {
    const previousEditingState = state.editing;
    if (state.editing) {
        state.editing = null;
        renderSheet();
    }

    const pageElements = createPaginatedPages();
    const totalPages = pageElements.length;

    const printContainer = document.createElement('div');
    printContainer.id = 'print-container';

    pageElements.forEach((pageDiv, index) => {
        const footer = document.createElement('div');
        footer.className = 'page-footer';
        if (totalPages > 1) {
            footer.textContent = `Seite ${index + 1} von ${totalPages}`;
        }
        pageDiv.appendChild(footer);
        printContainer.appendChild(pageDiv);
    });

    document.body.appendChild(printContainer);
    document.body.classList.add('is-printing');

    const originalTitle = document.title;
    const sheetTitle = state.sheetData.title;
    // Only change the title if it's meaningful
    if (sheetTitle && sheetTitle.trim() && sheetTitle !== 'Titel hier klicken') {
        document.title = sheetTitle.trim();
    }

    // Ensure fonts are loaded before printing
    setTimeout(() => {
        try {
            window.print();
        } finally {
            setTimeout(() => {
                document.body.removeChild(printContainer);
                document.body.classList.remove('is-printing');
                document.title = originalTitle; // Restore the original title
                if (previousEditingState) {
                    state.editing = previousEditingState;
                    renderSheet();
                }
            }, 100);
        }
    }, 200);
};

// --- INITIALIZATION ---
const init = () => {
    // Populate font selector
    GOOGLE_FONTS.forEach(font => {
        const option = document.createElement('option');
        option.value = font.family;
        option.textContent = font.name;
        option.style.fontFamily = font.family;
        dom.fontFamilySelect.appendChild(option);
    });
    
    dom.sheetMusicContainer.addEventListener('mousedown', handleSheetClick);
    dom.sheetMusicContainer.addEventListener('input', handleInputChange);
    document.body.addEventListener('click', handleGlobalClick);
    dom.exportButton.addEventListener('click', handleExportPNG);
    dom.printPdfButton.addEventListener('click', handlePrint);
    dom.addLineButton.addEventListener('click', handleAddNewLine);
    dom.helpButton.addEventListener('click', openHelpModal);
    dom.modalCloseButton.addEventListener('click', closeHelpModal);
    dom.helpModal.addEventListener('click', (e) => {
        if (e.target === dom.helpModal) {
            closeHelpModal();
        }
    });

    dom.headerToolbar.addEventListener('input', handleToolbarChange);
    
    renderSheet();
};

document.addEventListener('DOMContentLoaded', init);