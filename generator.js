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
    title: 'Title',
    titleFont: { family: "'Times New Roman', Times, serif", size: 40 },
    subtitle: 'Composer',
    subtitleFont: { family: "'Times New Roman', Times, serif", size: 19 },
    style: 'Style',
    styleFont: { family: "'Times New Roman', Times, serif", size: 19 },
    timeSignature: '4/4',
    lines: [
      {
        lineText: '<Verse',
        startBar: 'single',
        startBarVolta: '',
        measures: [
          { beats: ['', '', '', ''], barLine: 'single', barLineVolta: '', rehearsalMark: '' },
          { beats: ['', '', '', ''], barLine: 'single', barLineVolta: '', rehearsalMark: '' },
          { beats: ['', '', '', ''], barLine: 'single', barLineVolta: '', rehearsalMark: '' },
          { beats: ['', '', '', ''], barLine: 'final', barLineVolta: '', rehearsalMark: '' }
        ],
      }
    ]
  },
  editing: null,
  isExporting: false,
  isDirty: false,
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
  saveTxtButton: document.getElementById('save-txt-btn'),
  loadTxtButton: document.getElementById('load-txt-btn'),
  loadTxtInput: document.getElementById('load-txt-input'),
};

// --- HELPERS ---
const markAsDirty = () => {
    state.isDirty = true;
};

const getBeatsPerMeasure = () => {
    const [beats] = String(state.sheetData.timeSignature).split('/').map(s => parseInt(s, 10));
    return !isNaN(beats) && beats > 0 ? beats : 4;
};

/**
 * Parses a string for musical symbol triggers and returns a DocumentFragment
 * with text nodes and styled symbol spans.
 * @param {string} textToParse The input string.
 * @returns {DocumentFragment}
 */
const parseTextForSymbols = (textToParse) => {
    const fragment = document.createDocumentFragment();
    if (!textToParse) return fragment;

    const symbolRegex = /(\b(?:D\.S\.|D\.C\.|Coda)\b|\$)/ig;
    let lastIndex = 0;
    let match;

    while ((match = symbolRegex.exec(textToParse)) !== null) {
        if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(textToParse.substring(lastIndex, match.index)));
        }

        const symbolText = match[0];
        const lowerSymbol = symbolText.toLowerCase();
        let symbolSpan;

        switch (lowerSymbol) {
            case '$':
                symbolSpan = document.createElement('span');
                symbolSpan.className = 'musical-symbol segno-symbol';
                symbolSpan.textContent = '\uD834\uDD0B'; // U+1D10B (Segno)
                break;
            case 'coda':
                symbolSpan = document.createElement('span');
                symbolSpan.className = 'musical-symbol coda-symbol';
                symbolSpan.textContent = '\uD834\uDD0C'; // U+1D10C (Coda)
                break;
            case 'd.s.':
                symbolSpan = document.createElement('span');
                symbolSpan.className = 'musical-symbol ds-symbol';
                symbolSpan.textContent = '\uD834\uDD09'; // U+1D109 (Dal Segno)
                break;
            case 'd.c.':
                symbolSpan = document.createElement('span');
                symbolSpan.className = 'musical-symbol dc-symbol';
                symbolSpan.textContent = '\uD834\uDD0A'; // U+1D10A (Da Capo)
                break;
        }

        if (symbolSpan) {
            fragment.appendChild(symbolSpan);
        } else {
            fragment.appendChild(document.createTextNode(symbolText));
        }

        lastIndex = symbolRegex.lastIndex;
    }

    if (lastIndex < textToParse.length) {
        fragment.appendChild(document.createTextNode(textToParse.substring(lastIndex)));
    }

    return fragment;
};


// --- RENDERING LOGIC ---
const createChordElement = (chord) => {
    const chordDisplay = document.createElement('div');
    chordDisplay.className = 'chord-display';
    if (!chord) return chordDisplay;

    if (chord.trim() === '/') {
        const slash = document.createElement('span');
        slash.className = 'beat-slash';
        slash.textContent = '/'; // Use a standard slash for consistent font rendering
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

            // When editing, show the rehearsal mark in the input field for consistency
            const firstMeasureRehearsal = lineData.measures[0]?.rehearsalMark;
            let displayValue = lineData.lineText || '';
            if (firstMeasureRehearsal) {
                displayValue = `[${firstMeasureRehearsal}]${displayValue}`;
            }
            input.value = displayValue;

            lineTextContainer.appendChild(input);
        } else {
            const display = document.createElement('div');
            display.className = 'line-text-display';
            
            let rawText = lineData.lineText || '';
            let leftText = '', centerText = '', rightText = '';

            // NEW, ROBUST PARSING LOGIC
            const segments = rawText.split(/(?=[<>])/);
            let pendingWhitespace = '';

            for (const segment of segments) {
                if (segment.startsWith('<')) {
                    leftText += pendingWhitespace + segment.substring(1);
                    pendingWhitespace = '';
                } else if (segment.startsWith('>')) {
                    rightText += pendingWhitespace + segment.substring(1);
                    pendingWhitespace = '';
                } else {
                    // This segment does not start with a marker.
                    // If we have pending whitespace from a previous segment, it must now be
                    // considered center-aligned as no marker followed it.
                    centerText += pendingWhitespace;
                    pendingWhitespace = '';
                    
                    if (segment.trim() === '') {
                        // This segment is pure whitespace. Hold onto it in case
                        // it's leading space for the *next* segment's marker.
                        pendingWhitespace = segment;
                    } else {
                        // This is actual center-aligned text.
                        centerText += segment;
                    }
                }
            }
            // Any leftover whitespace at the very end of the string is center-aligned.
            centerText += pendingWhitespace;
            
            const leftSegment = document.createElement('span');
            leftSegment.className = 'line-text-left-segment';
            leftSegment.appendChild(parseTextForSymbols(leftText));
            display.appendChild(leftSegment);
        
            const centerSegment = document.createElement('span');
            centerSegment.className = 'line-text-center-segment';
            centerSegment.appendChild(parseTextForSymbols(centerText));
            display.appendChild(centerSegment);
        
            const rightSegment = document.createElement('span');
            rightSegment.className = 'line-text-right-segment';
            rightSegment.appendChild(parseTextForSymbols(rightText));
            display.appendChild(rightSegment);

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
        
        // --- Volta Editor Trigger for Start Bar ---
        const isEditingStartVolta = state.editing?.type === 'voltaOnStartBar' && state.editing.lineIndex === lineIndex;
        const startVoltaEditor = document.createElement('div');
        startVoltaEditor.className = 'volta-editor';
        if (isEditingStartVolta) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'volta-editor-input';
            input.value = lineData.startBarVolta || '';
            startVoltaEditor.appendChild(input);
        } else {
            const trigger = document.createElement('button');
            trigger.className = 'volta-editor-trigger';
            trigger.textContent = 'V';
            trigger.setAttribute('aria-label', `Edit volta start for line ${lineIndex + 1}`);
            startVoltaEditor.appendChild(trigger);
        }
        startBarContainer.appendChild(startVoltaEditor);
        
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
                deleteBtn.setAttribute('aria-label', `Delete measure ${measureIndex + 1}`);
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
            
            // --- Volta Bracket Display ---
            // The volta bracket over a measure is defined by the bar line *before* it.
            const voltaText = (measureIndex === 0)
                ? lineData.startBarVolta
                : lineData.measures[measureIndex - 1].barLineVolta;

            if (voltaText && voltaText.trim()) {
                const voltaDisplayContainer = document.createElement('div');
                voltaDisplayContainer.className = 'volta-display-container';

                if (measure.rehearsalMark) {
                    voltaDisplayContainer.style.marginBottom = '45px';
                }

                const display = document.createElement('div');
                display.className = 'volta-display';

                // Determine connections by comparing with adjacent measures' volta text.
                // The volta for the previous measure.
                const prevVoltaText = (measureIndex > 0)
                    ? (
                        (measureIndex === 1)
                            ? lineData.startBarVolta
                            : lineData.measures[measureIndex - 2].barLineVolta
                    )
                    : null;
                
                // The volta for the next measure.
                const nextVoltaText = (measureIndex < lineData.measures.length - 1)
                    ? measure.barLineVolta // The V on the bar line *after* the current measure controls the *next* measure's bracket.
                    : null; // No next measure, so no next volta text to compare to.

                const startsHere = prevVoltaText !== voltaText;
                // If there's no next measure, the bracket must end here. Otherwise, compare text.
                const endsHere = (nextVoltaText === null) || (nextVoltaText !== voltaText);

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
                    text.textContent = voltaText;
                    display.appendChild(text);
                }

                if (endsHere) {
                    const endHook = document.createElement('div');
                    endHook.className = 'volta-hook volta-end-hook';
                    display.appendChild(endHook);
                }
                voltaDisplayContainer.appendChild(display);
                measureEl.appendChild(voltaDisplayContainer);
            }
            
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

            // --- Volta Editor Trigger ---
            const isEditingThisVolta = state.editing?.type === 'voltaOnBarLine' && state.editing.lineIndex === lineIndex && state.editing.measureIndex === measureIndex;
            const voltaEditor = document.createElement('div');
            voltaEditor.className = 'volta-editor';

            if (isEditingThisVolta) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'volta-editor-input';
                input.value = measure.barLineVolta || '';
                voltaEditor.appendChild(input);
            } else {
                const trigger = document.createElement('button');
                trigger.className = 'volta-editor-trigger';
                trigger.textContent = 'V';
                trigger.setAttribute('aria-label', `Edit volta point after measure ${measureIndex + 1}`);
                voltaEditor.appendChild(trigger);
            }
            barLineContainer.appendChild(voltaEditor);

            lineEl.appendChild(barLineContainer);
        });

        // --- Render Add Measure Button ---
        if (lineData.measures.length < 4) {
            const addMeasureBtn = document.createElement('button');
            addMeasureBtn.className = 'add-measure-btn';
            addMeasureBtn.textContent = '+';
            addMeasureBtn.dataset.lineIndex = String(lineIndex);
            addMeasureBtn.setAttribute('aria-label', 'Add measure');
            lineEl.appendChild(addMeasureBtn);
        }
        
        // Add line delete button if there is more than one line
        if (state.sheetData.lines.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'line-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.dataset.lineIndex = String(lineIndex);
            deleteBtn.setAttribute('aria-label', `Delete line ${lineIndex + 1}`);
            lineEl.appendChild(deleteBtn);
        }
        
        lineWrapper.appendChild(lineEl);
        measuresContainer.appendChild(lineWrapper);
    });
    sheetBody.appendChild(measuresContainer);
    dom.sheetMusicContainer.appendChild(sheetBody);

    if (state.editing) {
        let selector;
        const { type, lineIndex, measureIndex } = state.editing;

        switch (type) {
            case 'header':
                selector = `.sheet-header [data-part="${state.editing.part}"].header-input`;
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
            case 'voltaOnStartBar':
                selector = `.bar-line-container[data-line-index="${lineIndex}"][data-type="startBar"] .volta-editor-input`;
                break;
            case 'voltaOnBarLine':
                selector = `.bar-line-container[data-line-index="${lineIndex}"][data-measure-index="${measureIndex}"] .volta-editor-input`;
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
        barLineVolta: '',
        rehearsalMark: '',
        barLine: isLastLineOfSheet ? 'final' : 'single'
    };

    line.measures.push(newMeasure);
    
    markAsDirty();
    state.editing = null;
    renderSheet();
};

const handleSheetClick = (e) => {
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

                if (wasLastMeasureInLine && line.measures.length > 0) {
                    const isLastLineOfSheet = lineIndex === state.sheetData.lines.length - 1;
                    line.measures[line.measures.length - 1].barLine = isLastLineOfSheet ? 'final' : 'single';
                }
                
                markAsDirty();
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
            markAsDirty();
            state.editing = null;
            renderSheet();
        }
        return; 
    }
    
    const voltaTrigger = target.closest('.volta-editor-trigger');
    if (voltaTrigger) {
        const barContainer = voltaTrigger.closest('.bar-line-container');
        const lineIndex = parseInt(barContainer.dataset.lineIndex, 10);
        if (barContainer.dataset.type === 'startBar') {
            newEditingState = { type: 'voltaOnStartBar', lineIndex: lineIndex };
        } else {
            const measureIndex = parseInt(barContainer.dataset.measureIndex, 10);
            newEditingState = { type: 'voltaOnBarLine', lineIndex: lineIndex, measureIndex: measureIndex };
        }
    } else {
        const lineTextContainer = target.closest('.line-text-container');
        const rehearsalMarkContainer = target.closest('.rehearsal-mark-container');
        const measureEl = target.closest('.measure');
        const barEl = target.closest('.bar-line-container');
        const headerEl = target.closest('.sheet-header [data-part]');
        const timeEl = target.closest('.time-signature');

        if (lineTextContainer) {
            newEditingState = { type: 'lineText', lineIndex: parseInt(lineTextContainer.dataset.lineIndex, 10) };
        } else if (rehearsalMarkContainer) {
            newEditingState = { type: 'rehearsalMark', lineIndex: parseInt(rehearsalMarkContainer.dataset.lineIndex, 10), measureIndex: parseInt(rehearsalMarkContainer.dataset.measureIndex, 10) };
        } else if (measureEl) {
            newEditingState = { type: 'measure', lineIndex: parseInt(measureEl.dataset.lineIndex, 10), measureIndex: parseInt(measureEl.dataset.measureIndex, 10) };
        } else if (barEl) {
            if (barEl.dataset.type === 'startBar') {
                newEditingState = { type: 'startBar', lineIndex: parseInt(barEl.dataset.lineIndex, 10) };
            } else {
                newEditingState = { type: 'barLine', lineIndex: parseInt(barEl.dataset.lineIndex, 10), measureIndex: parseInt(barEl.dataset.measureIndex, 10) };
            }
        } else if (headerEl) {
            newEditingState = { type: 'header', part: headerEl.dataset.part };
        } else if (timeEl) {
            newEditingState = { type: 'timeSignature' };
        }
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

    markAsDirty();

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
            const beatIndex = parseInt(target.dataset.beatIndex, 10);
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
        case 'voltaOnStartBar':
            const { lineIndex: vsbLine } = state.editing;
            state.sheetData.lines[vsbLine].startBarVolta = target.value;
            break;
        case 'voltaOnBarLine':
            const { lineIndex: vblLine, measureIndex: vblMeasure } = state.editing;
            state.sheetData.lines[vblLine].measures[vblMeasure].barLineVolta = target.value;
            break;
        case 'lineText': {
            const { lineIndex: ltLine } = state.editing;
            const line = state.sheetData.lines[ltLine];
            const rawValue = target.value;

            // Regex to find a rehearsal mark like [A] or [Verse] at the start of the string.
            const rehearsalMarkRegex = /^\[([^\]]+)\]/;
            const match = rawValue.match(rehearsalMarkRegex);

            if (match) {
                const rehearsalMark = match[1]; // The text inside the brackets
                if (line.measures[0]) {
                    line.measures[0].rehearsalMark = rehearsalMark;
                }
                // The rest of the string becomes the line text.
                // Using substring is more explicit than replace and avoids potential
                // side effects, ensuring all leading spaces after the mark are preserved.
                line.lineText = rawValue.substring(match[0].length);
            } else {
                 // If no match, clear the rehearsal mark on the first measure
                 // to ensure removing "[A]" from the input also removes the mark.
                if (line.measures[0]) {
                    line.measures[0].rehearsalMark = '';
                }
                line.lineText = rawValue;
            }
            break;
        }
    }
};

const handleToolbarChange = () => {
    if (state.editing?.type !== 'header') return;
    
    markAsDirty();

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
        startBarVolta: '',
        measures: [
            { beats: [...newBeats], barLine: 'single', barLineVolta: '', rehearsalMark: '' },
            { beats: [...newBeats], barLine: 'single', barLineVolta: '', rehearsalMark: '' },
            { beats: [...newBeats], barLine: 'single', barLineVolta: '', rehearsalMark: '' },
            { beats: [...newBeats], barLine: 'final', barLineVolta: '', rehearsalMark: ''}
        ],
    };
    state.sheetData.lines.push(newLine);
    markAsDirty();
    renderSheet();
};

/**
 * Creates a "clean" clone of an element for printing by physically removing any
 * interactive input/editor elements. This is a robust failsafe against
 * browser rendering bugs where CSS `display: none` might be ignored.
 * @param {HTMLElement} element The element to clone and clean.
 * @returns {HTMLElement} A clean clone of the element.
 */
const cloneAndCleanForPrint = (element) => {
    const clone = element.cloneNode(true);
    const selectorsToRemove = [
        '.header-input',
        '.time-signature-input',
        '.line-text-input',
        '.measure-editor',
        '.bar-line-input',
        '.rehearsal-mark-input',
        '.volta-editor',
        '.volta-editor-input'
    ];
    clone.querySelectorAll(selectorsToRemove.join(', ')).forEach(el => el.remove());
    return clone;
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
            pageContentWrapper.appendChild(cloneAndCleanForPrint(header));
            const bodyClone = cloneAndCleanForPrint(sheetBody);
            const measuresContainer = bodyClone.querySelector('.measures-container');
            if (measuresContainer) {
                measuresContainer.innerHTML = '';
                pageLines.forEach(line => measuresContainer.appendChild(cloneAndCleanForPrint(line)));
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
            pageLines.forEach(line => measuresContainer.appendChild(cloneAndCleanForPrint(line)));
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
        alert('Error: The export library (html2canvas) could not be loaded. Please check your internet connection.');
        return;
    }

    document.body.classList.add('is-exporting');
    state.isExporting = true;
    dom.exportButton.textContent = 'Exporting...';
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
            });

            const link = document.createElement('a');
            const filename = pageElements.length > 1
                ? `${baseFilename}_page_${i + 1}.png`
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
        alert('Error during export. Please try again.');
    } finally {
        state.isExporting = false;
        dom.exportButton.textContent = 'Export as PNG';
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
            footer.textContent = `Page ${index + 1} of ${totalPages}`;
        }
        pageDiv.appendChild(footer);
        printContainer.appendChild(pageDiv);
    });

    document.body.appendChild(printContainer);
    document.body.classList.add('is-printing');

    const originalTitle = document.title;
    const sheetTitle = state.sheetData.title;
    // Only change the title if it's meaningful
    if (sheetTitle && sheetTitle.trim() && sheetTitle !== 'Click to edit title') {
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

// --- TXT Import / Export ---
const generateSheetTXT = () => {
    const data = state.sheetData;
    let txt = `# Lead Sheet generated by Lead Sheet Generator\n`;
    txt += `# Format: @directive: value\n\n`;

    // Metadata
    txt += `@title: ${data.title}\n`;
    txt += `@titleFont: ${data.titleFont.family}, ${data.titleFont.size}\n`;
    txt += `@subtitle: ${data.subtitle}\n`;
    txt += `@subtitleFont: ${data.subtitleFont.family}, ${data.subtitleFont.size}\n`;
    txt += `@style: ${data.style}\n`;
    txt += `@styleFont: ${data.styleFont.family}, ${data.styleFont.size}\n`;
    txt += `@time: ${data.timeSignature}\n\n`;

    // Lines
    data.lines.forEach((line, index) => {
        txt += `// --- Line ${index + 1} ---\n`;
        txt += `@lineText: ${line.lineText || ''}\n`;
        
        const measureStrings = line.measures.map(m => m.beats.map(b => b.trim() || '_').join(' '));
        
        let chordsLine = `${SYMBOL_LOOKUP[line.startBar] || '|'}`;
        line.measures.forEach((measure, mIndex) => {
            chordsLine += ` ${measureStrings[mIndex]} ${SYMBOL_LOOKUP[measure.barLine] || '|'}`;
        });
        txt += `chords: ${chordsLine}\n`;
        
        const rehearsalMarks = line.measures.map(m => m.rehearsalMark || '_').join(',');
        if (rehearsalMarks.replace(/[_,]/g, '')) {
            txt += `rehearsal: ${rehearsalMarks}\n`;
        }

        const voltas = [line.startBarVolta || '_', ...line.measures.map(m => m.barLineVolta || '_')].join(',');
        if (voltas.replace(/[_,]/g, '')) {
             txt += `voltas: ${voltas}\n`;
        }

        txt += `\n`;
    });

    return txt;
};

const handleSaveTXT = () => {
    const txtContent = generateSheetTXT();
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const filename = (state.sheetData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'leadsheet') + '.txt';
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const parseSheetDataFromTXT = (text) => {
    const newSheetData = {
        title: 'Title',
        titleFont: { family: "'Times New Roman', Times, serif", size: 40 },
        subtitle: 'Composer',
        subtitleFont: { family: "'Times New Roman', Times, serif", size: 19 },
        style: 'Style',
        styleFont: { family: "'Times New Roman', Times, serif", size: 19 },
        timeSignature: '4/4',
        lines: []
    };
    const lines = text.split('\n');
    let currentLineContext = null;

    const processAndCommitCurrentLine = () => {
        if (!currentLineContext) return;

        // 1. Parse Chords (must happen first to create measures)
        if (currentLineContext.chordsStr) {
            const value = currentLineContext.chordsStr;
            const parts = value.split(/\s*(\|\|\||\|\||\|<|>\||\||\})\s*/).filter(p => p.trim());
            
            if (parts.length > 0) {
                if (BAR_SYMBOLS[parts[0]]) {
                    currentLineContext.data.startBar = BAR_SYMBOLS[parts.shift()];
                } else {
                    currentLineContext.data.startBar = 'single';
                }

                for (let i = 0; i < parts.length; i += 2) {
                    const beatsStr = parts[i];
                    const barSymbol = parts[i + 1];
                    if (!beatsStr || !barSymbol) continue; // Skip incomplete pairs

                    const beats = beatsStr.split(' ').map(b => (b === '_' ? '' : b));
                    const barLine = BAR_SYMBOLS[barSymbol] || 'single';
                    
                    currentLineContext.data.measures.push({
                        beats,
                        barLine,
                        barLineVolta: '',
                        rehearsalMark: ''
                    });
                }
            }
        }

        // 2. Parse Rehearsal Marks (after measures are created)
        if (currentLineContext.rehearsalStr) {
            const rehearsalMarks = currentLineContext.rehearsalStr.split(',');
            rehearsalMarks.forEach((mark, index) => {
                if (currentLineContext.data.measures[index]) {
                    currentLineContext.data.measures[index].rehearsalMark = (mark.trim() === '_' ? '' : mark.trim());
                }
            });
        }

        // 3. Parse Voltas (after measures are created)
        if (currentLineContext.voltasStr) {
            const voltas = currentLineContext.voltasStr.split(',');
            if (voltas.length > 0) {
                currentLineContext.data.startBarVolta = (voltas[0].trim() === '_' ? '' : voltas[0].trim());
            }
            voltas.slice(1).forEach((volta, index) => {
                if (currentLineContext.data.measures[index]) {
                    currentLineContext.data.measures[index].barLineVolta = (volta.trim() === '_' ? '' : volta.trim());
                }
            });
        }

        newSheetData.lines.push(currentLineContext.data);
        currentLineContext = null;
    };

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('#') || !trimmedLine) {
            continue;
        }
        if (trimmedLine.startsWith('// ---')) {
            processAndCommitCurrentLine();
            continue;
        }

        const [key, ...valueParts] = trimmedLine.split(':');
        const value = valueParts.join(':').trim();

        if (key.startsWith('@')) {
            switch(key) {
                case '@title': newSheetData.title = value; break;
                case '@subtitle': newSheetData.subtitle = value; break;
                case '@style': newSheetData.style = value; break;
                case '@time': newSheetData.timeSignature = value; break;
                case '@titleFont': {
                    const lastCommaIndex = value.lastIndexOf(',');
                    if (lastCommaIndex !== -1) {
                        const family = value.substring(0, lastCommaIndex).trim();
                        const size = parseInt(value.substring(lastCommaIndex + 1).trim(), 10);
                        if (family && !isNaN(size)) {
                            newSheetData.titleFont = { family, size };
                        }
                    }
                    break;
                }
                case '@subtitleFont': {
                    const lastCommaIndex = value.lastIndexOf(',');
                    if (lastCommaIndex !== -1) {
                        const family = value.substring(0, lastCommaIndex).trim();
                        const size = parseInt(value.substring(lastCommaIndex + 1).trim(), 10);
                        if (family && !isNaN(size)) {
                            newSheetData.subtitleFont = { family, size };
                        }
                    }
                    break;
                }
                case '@styleFont': {
                    const lastCommaIndex = value.lastIndexOf(',');
                    if (lastCommaIndex !== -1) {
                        const family = value.substring(0, lastCommaIndex).trim();
                        const size = parseInt(value.substring(lastCommaIndex + 1).trim(), 10);
                        if (family && !isNaN(size)) {
                            newSheetData.styleFont = { family, size };
                        }
                    }
                    break;
                }
                case '@lineText':
                    processAndCommitCurrentLine();
                    currentLineContext = {
                        data: { lineText: value, startBar: 'single', startBarVolta: '', measures: [] },
                        chordsStr: null, rehearsalStr: null, voltasStr: null,
                    };
                    break;
            }
        } else if (currentLineContext) {
            switch(key) {
                case 'chords': currentLineContext.chordsStr = value; break;
                case 'rehearsal': currentLineContext.rehearsalStr = value; break;
                case 'voltas': currentLineContext.voltasStr = value; break;
            }
        }
    }
    
    processAndCommitCurrentLine();

    if (newSheetData.lines.length === 0) {
        throw new Error("Invalid or empty file format. No lines found.");
    }

    return newSheetData;
};

const handleLoadFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const newSheetData = parseSheetDataFromTXT(event.target.result);
            state.sheetData = newSheetData;
            state.isDirty = false;
            state.editing = null;
            renderSheet();
        } catch (error) {
            console.error("Failed to parse TXT file:", error);
            alert(`Error loading file: ${error.message}\nPlease ensure it's a valid lead sheet TXT file.`);
        } finally {
            e.target.value = null;
        }
    };
    reader.onerror = () => {
         alert('Error reading the file.');
         e.target.value = null;
    };
    reader.readAsText(file);
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

    dom.saveTxtButton.addEventListener('click', handleSaveTXT);
    dom.loadTxtButton.addEventListener('click', () => dom.loadTxtInput.click());
    dom.loadTxtInput.addEventListener('change', handleLoadFile);
    
    window.addEventListener('beforeunload', (e) => {
        if (state.isDirty) {
            // Standard way to trigger the browser's confirmation dialog.
            e.preventDefault();
            // Required for some browsers.
            e.returnValue = '';
        }
    });
    
    renderSheet();
};

document.addEventListener('DOMContentLoaded', init);

// Fix: Add export statement to treat this file as a module and prevent global scope conflicts.
export {};
