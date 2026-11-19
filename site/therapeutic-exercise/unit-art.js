// Chalk sketches for the unit headers on the contents page, one per unit (= chapter of the book), drawn in the unit's colour.
// Each entry is the inside of an SVG with viewBox 0 0 600 180; keep the left ~200 px light (the unit title sits there
// on narrow screens). Classes, styled in index.html:
//   d  a stroke that draws itself in when the unit scrolls into view (--k orders the strokes)
//   t  text or a filled shape that fades in
//   a  faint chalk white instead of the unit colour;  faint  even fainter
// A sketch may add one looping motion after it is drawn: give an element a class and add a .seen .unit-art .NAME
// rule with its keyframes in index.html (raise: an arm that lifts about the shoulder at 330 66).
'use strict';
(() => {
  let k = 0;
  const P = (d, cls = '', extra = '') => `<path class="d ${cls}" pathLength="1" style="--k:${k++}" d="${d}" ${extra}/>`;
  const Tx = (x, y, s, size = 24, cls = '', anchor = 'start') => `<text class="t ${cls}" style="--k:${k++}" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${s}</text>`;
  const C = (cx, cy, r, cls = '') => `<circle class="d ${cls}" pathLength="1" style="--k:${k++}" cx="${cx}" cy="${cy}" r="${r}"/>`;
  const reset = s => { k = 0; return s; };

  window.UNIT_ART = [
    // 1 Foundational concepts: a figure lifting an arm through its range, and the three linked ideas of the ICF.
    reset(P('M230 162H450', 'a') + C(330, 40, 12) + P('M330 52V110') + P('M330 110L320 160M330 110L342 160') +
      `<g class="raise">${P('M330 66L330 104')}</g>` +
      P('M330 104A38 38 0 0 0 330 28', 'faint', 'stroke-dasharray="4 7"') +
      C(480, 70, 16, 'a') + C(540, 70, 16, 'a') + C(510, 122, 16, 'a') + P('M496 70H524M488 84L502 108M532 84L518 108', 'a') +
      Tx(510, 30, 'МКФ', 22, '', 'middle')),
    // 2 Prevention, health and wellness: a walking figure and the six-spoke wellness wheel.
    reset(P('M230 162H430', 'a') + C(300, 40, 12) + P('M300 52L304 108') + P('M304 108L290 160M304 108L322 158') +
      P('M302 66L284 98M302 66L322 94') +
      C(500, 92, 58) + P('M500 34V150M450 63L550 121M450 121L550 63', 'faint') +
      P('M500 92m-30 0a30 30 0 1 0 60 0a30 30 0 1 0 -60 0', 'a') +
      Tx(500, 22, 'благополучие', 20, '', 'middle')),
    // 3 Range of motion: a patient lying on a table, one leg raised through an arc measured in degrees.
    reset(P('M220 120H520', 'a') + P('M240 120V165M500 120V165', 'a') + C(262, 104, 11) + P('M274 106H380') +
      P('M380 106L470 108') + P('M380 106L440 40') + P('M380 106L380 44', 'faint') +
      P('M460 106A80 80 0 0 0 437 50', '', 'stroke-dasharray="4 7"') + Tx(478, 62, 'ROM', 22, '', 'start')),
    // 4 Stretching: a person reaching for the toes, and the stress-strain curve of the stretched tissue.
    reset(P('M220 160H440', 'a') + P('M250 150H400') + P('M400 150V134') + P('M250 150L322 108') + C(334, 99, 11) +
      P('M318 113L394 140') + P('M470 28V160H590', 'a') +
      P('M470 160Q488 152 498 134L540 72Q556 52 576 62', '', '') + P('M540 72V160', 'faint', 'stroke-dasharray="4 7"') +
      Tx(530, 22, 'растяжка', 20, '', 'middle')),
    // 5 Joint mobilization: a convex head in a concave cup, the treatment plane and a glide along it.
    reset(P('M230 74H318Q330 74 336 62M230 110H318Q330 110 336 122', 'a') + P('M336 58A40 40 0 0 0 336 126') + C(374, 92, 32) +
      P('M396 110L520 160M404 96L528 146', 'a') + P('M330 34V150', 'faint', 'stroke-dasharray="4 7"') +
      P('M450 54V118M441 106L450 120L459 106') + Tx(520, 30, 'скольжение', 20, '', 'middle')),
    // 6 Resistance exercise: a figure curling a dumbbell, and the load raised step by step (the overload principle).
    reset(P('M230 162H420', 'a') + C(300, 40, 12) + P('M300 52L304 108') + P('M304 108L292 160M304 108L320 158') +
      P('M302 66L308 100L340 76') + P('M334 62V90M346 62V90M334 76H346') +
      P('M440 150H480V126H520V102H560V78H592') + P('M440 160Q500 150 520 118T592 86', 'faint') +
      Tx(520, 30, 'перегрузка', 20, '', 'middle')),
    // 7 Aerobic exercise: a runner, and the ECG trace of a heart rate that speeds up.
    reset(P('M230 162H420', 'a') + C(306, 38, 12) + P('M304 50L312 104') + P('M312 104L292 134L280 160M312 104L338 130L356 150') +
      P('M306 66L288 88L300 102M306 66L326 86L342 72') +
      P('M430 104H452L458 94L464 104L472 50L480 134L486 104H514L520 94L526 104L533 50L540 134L546 104H566L571 96L576 104L582 50L588 134L593 104', '') +
      P('M430 150H595', 'faint') + Tx(512, 30, 'выносливость', 20, '', 'middle')),
    // 8 Balance: a figure on one leg, its centre of mass over the base of support, and the feet seen from above.
    reset(P('M230 162H420', 'a') + C(318, 38, 12) + P('M318 50L320 104') + P('M320 104L318 160M320 104L340 128L326 146') +
      P('M319 64L282 78M319 64L358 76') + C(320, 92, 7) + P('M320 99V160', 'faint', 'stroke-dasharray="4 7"') + P('M306 164H332') +
      P('M470 140C462 122 466 86 474 70C480 60 492 62 494 74C498 100 494 124 488 140Z', 'a') +
      P('M530 140C538 122 534 86 526 70C520 60 508 62 506 74C502 100 506 124 512 140Z', 'a') +
      P('M466 144L462 72Q470 54 484 60L516 60Q530 54 538 72L534 144Z', '', 'stroke-dasharray="6 6"') + C(500, 102, 6) +
      Tx(500, 30, 'равновесие', 20, '', 'middle')),
    // 9 Aquatic exercise: a patient floating supine on the surface, buoyancy pushing up, and a deep-water runner.
    reset(P('M230 112Q245 104 260 112T290 112T320 112T350 112T380 112T410 112T440 112T470 112T500 112T530 112T560 112T590 112', 'a') +
      C(286, 106, 9) + P('M295 108H368') + P('M368 108L428 110M368 108L424 117') + P('M305 109L340 115') +
      P('M320 156V126M312 135L320 124L328 135', 'faint') + P('M370 156V126M362 135L370 124L378 135', 'faint') +
      C(522, 72, 10) + P('M521 82L516 124') + P('M516 124L540 130L546 154M516 124L506 148L492 160') +
      P('M519 92L506 110L512 124M519 92L534 108L540 96') + P('M508 104H500', '', 'stroke-width="5"') +
      Tx(520, 30, 'вода', 20, '', 'middle')),
    // 10 Soft tissue injury: two bone ends with a ligament, some fibres torn, and three overlapping stages of healing.
    reset(P('M276 22V62Q300 82 324 62V22') + P('M276 162V108Q300 90 324 108V162') +
      P('M328 52L332 118M336 54L340 118', 'a') + P('M344 56L347 76M344 80L340 86', 'a') + P('M350 118L349 98M349 94L354 88', 'a') +
      P('M400 152H596', 'faint') + P('M404 152Q430 52 458 152', 'a') + P('M432 152Q482 72 532 152') + P('M478 152Q536 90 594 132', 'faint') +
      Tx(500, 30, 'заживление', 20, '', 'middle')),
    // 11 Joint, connective tissue and bone disorders: a worn joint with bony lips, and a broken long bone in its callus.
    reset(P('M266 20V64Q290 86 314 64V20') + P('M266 162V114Q290 100 314 114V162') +
      P('M266 66L256 72M314 66L324 72M266 112L256 106M314 112L324 106', 'a') +
      P('M252 50Q238 90 252 130', 'faint') + P('M328 50Q342 90 328 130', 'faint') +
      C(380, 100, 15) + P('M392 88H470L478 100L468 112H392') +
      P('M488 88H578L578 88M486 88L494 100L484 112H578') + C(590, 100, 15) +
      P('M436 100C446 64 520 64 530 100C520 136 446 136 436 100', 'a', 'stroke-dasharray="5 6"') +
      Tx(480, 30, 'суставы и кости', 20, '', 'middle')),
    // 12 Surgery and postoperative management: a scalpel, and a hip implant (cup, ball and stem) in the femur.
    reset(P('M240 104H318', '', 'stroke-width="7"') + P('M318 98L360 98Q384 104 360 112L318 110Z') +
      P('M446 78A36 36 0 0 1 518 78', 'a') + C(482, 82, 20) + P('M494 98L530 124L538 170M512 96L548 120L556 170', 'a') +
      P('M492 100L526 126L532 168H546L540 122L508 94', '', 'stroke-dasharray="5 5"') +
      Tx(490, 30, 'операция', 20, '', 'middle')),
    // 13 Peripheral nerves: a nerve in section (fascicles in the epineurium) and a nerve gliding wavy along a limb.
    reset(C(300, 96, 52) + C(282, 80, 16, 'a') + C(318, 82, 14, 'a') + C(300, 116, 15, 'a') +
      P('M400 92C430 74 460 110 490 92S550 74 580 92', '', 'stroke-width="5"') + P('M400 112H580', 'faint') +
      P('M420 92v0M470 98v0M520 86v0', 'a', 'stroke-width="9"') +
      Tx(490, 30, 'нервы', 20, '', 'middle')),
    // 14 The spine and posture: a column with its curves beside a plumb line, and a motion segment (two vertebrae, disc).
    reset(P('M342 10V170', 'faint', 'stroke-dasharray="4 7"') + C(338, 24, 12) +
      P('M318 168Q348 136 326 104Q300 74 320 50Q334 42 332 36', '', 'stroke-width="9" stroke-dasharray="7 3"') +
      P('M460 58H540V96H460ZM460 114H540V152H460Z') + P('M464 105H536', 'a', 'stroke-width="12"') + C(510, 105, 6) +
      P('M460 66L432 62L410 72M460 122L432 118L410 128', 'a') +
      Tx(500, 30, 'позвоночник', 20, '', 'middle')),
    // 15 Spine management: a disc from above with a posterolateral protrusion on a root, and a prone press-up on a table.
    reset(P('M282 98A50 36 0 1 0 382 98A50 36 0 1 0 282 98') + P('M300 98A32 22 0 1 0 364 98A32 22 0 1 0 300 98', 'a') +
      P('M352 126Q376 140 362 150Q350 152 344 132', '', 'stroke-width="4"') + C(378, 156, 9, 'a') + C(286, 156, 9, 'a') +
      P('M420 162H590', 'faint') + P('M430 156L510 150Q540 146 552 112', '', 'stroke-width="8"') + C(566, 98, 11) +
      P('M552 116L560 158', 'a', 'stroke-width="5"') +
      Tx(500, 30, 'ведение', 20, '', 'middle')),
    // 16 Spine exercises: a pressure-biofeedback dial and a person on all fours lifting an arm and the opposite leg.
    reset(C(272, 104, 30, 'a') + P('M272 104L290 88', '', 'stroke-width="4"') + P('M248 120A30 30 0 0 1 296 120', 'faint') +
      P('M340 156H600', 'faint') + P('M410 100Q460 90 506 96', '', 'stroke-width="9"') + C(530, 90, 12) +
      P('M506 98L512 154M410 102L414 152L362 154', 'a', 'stroke-width="6"') +
      P('M506 94L586 76M410 100L338 88', '', 'stroke-width="6"') +
      Tx(470, 30, 'упражнения', 20, '', 'middle')),
    // 17 Shoulder and shoulder girdle: a frontal section of the shoulder (acromion over the head, cuff tendon, glenoid)
    // and a scapula from behind turning up as the arm rises.
    reset(P('M240 58H330', '', 'stroke-width="9"') + C(304, 104, 30) + P('M262 64Q300 52 330 70', 'a', 'stroke-width="6"') +
      P('M268 78Q264 104 270 130', '', 'stroke-width="5"') + P('M318 128L336 170', '', 'stroke-width="10"') +
      P('M430 64L520 52L474 150Z') + P('M444 72L520 56', 'a', 'stroke-width="4"') + C(526, 60, 9) +
      P('M530 66L590 30', '', 'stroke-width="8"') + P('M552 40A40 40 0 0 1 574 88', 'faint', 'stroke-dasharray="5 6"') +
      Tx(450, 30, 'плечо', 20, '', 'middle')),
    // 18 Elbow and forearm: an elbow from the side (humerus, trochlea, the forearm bent up, the biceps over the front)
    // and a forearm end-on with the radius swinging round the ulna.
    reset(P('M296 16V92', '', 'stroke-width="12"') + C(300, 104, 15) + P('M306 112L372 70', '', 'stroke-width="10"') +
      P('M312 26Q342 60 334 98', 'a', 'stroke-width="8"') + P('M282 26Q270 70 284 112', 'faint', 'stroke-width="6"') +
      C(500, 104, 36, 'faint') + C(504, 122, 10) + C(486, 84, 13, 'a') +
      P('M456 70A50 50 0 0 1 548 78', '', 'stroke-dasharray="5 6"') + P('M540 66L548 78L534 82', '', 'stroke-width="3"') +
      Tx(430, 30, 'локоть', 20, '', 'middle')),
    // 19 Wrist and hand: a hand from the back with the fingers spread and the thumb out, and a finger from the side
    // curling, with the flexor tendon running under it.
    reset(P('M300 172L298 126Q300 106 312 100L364 104Q374 114 368 132L362 172') +
      P('M308 102L298 40M326 98L324 28M346 100L352 36M362 108L376 58', '', 'stroke-width="8"') +
      P('M302 148L272 114L262 90', 'a', 'stroke-width="8"') + P('M300 172H362', 'faint') +
      P('M430 122H498', '', 'stroke-width="9"') + P('M498 122L538 110L560 128L566 150', '', 'stroke-width="8"') +
      C(498, 122, 6, 'a') + C(538, 110, 5, 'a') + C(560, 128, 5, 'a') +
      P('M430 136Q520 140 556 150', 'a', 'stroke-width="3" stroke-dasharray="5 6"') +
      Tx(470, 30, 'кисть', 20, '', 'middle')),
    // 20 Hip: the pelvis from the front with both femoral heads in their sockets and the femurs angled in,
    // and a leg from the side flexing at the hip, with the arc of the movement.
    reset(P('M256 38Q262 84 300 92Q330 106 360 92Q398 84 404 38') + P('M318 40L330 80L342 40', 'faint') +
      P('M282 70A20 20 0 0 1 312 66M348 66A20 20 0 0 1 378 70', 'a') + C(296, 80, 11) + C(364, 80, 11) +
      P('M290 88L274 104L288 172M370 88L386 104L372 172', '', 'stroke-width="8"') +
      P('M480 12V60', 'a', 'stroke-width="7"') + C(480, 62, 7) + P('M484 66L536 92', '', 'stroke-width="9"') +
      P('M536 92L546 160L566 162', '', 'stroke-width="8"') +
      P('M480 124A62 62 0 0 0 534 92', 'faint', 'stroke-dasharray="5 6"') +
      Tx(546, 30, 'таз и бедро', 20, '', 'middle')),
    // 21 Knee: the knee from the side (femur, the patella in front, the tibia bent back, the cruciates crossing)
    // and the meniscus C seen from above.
    reset(P('M300 16L306 92', '', 'stroke-width="12"') + C(306, 102, 16) + P('M312 114L292 172', '', 'stroke-width="10"') +
      C(330, 96, 9, 'a') + P('M328 106L322 140', 'faint', 'stroke-width="5"') +
      P('M298 98L314 116M314 96L298 118', 'a', 'stroke-width="3"') +
      P('M520 70A40 34 0 1 0 520 136', '', 'stroke-width="9"') + P('M560 76A28 26 0 1 1 560 130', 'a', 'stroke-width="7"') +
      Tx(470, 30, 'колено', 20, '', 'middle')),
    // 22 Ankle and foot: the ankle from the side (the tibia on the talar dome, the foot arching forward, the Achilles
    // tendon to the heel) and the foot from above with the five rays.
    reset(P('M292 14L296 84', '', 'stroke-width="12"') + C(298, 98, 15) +
      P('M282 110Q300 122 330 128L392 150L408 160', '', 'stroke-width="9"') + P('M270 130Q300 152 400 162', 'faint') +
      P('M276 20Q270 80 278 118', 'a', 'stroke-width="6"') + P('M300 112Q340 104 384 146', 'a', 'stroke-width="3" stroke-dasharray="5 6"') +
      P('M500 172Q484 150 490 120L496 96', '', 'stroke-width="10"') +
      P('M496 96L486 40M502 94L500 34M510 96L516 40M518 100L530 48M526 106L544 62', '', 'stroke-width="6"') +
      C(486, 40, 5, 'a') + C(500, 34, 4, 'a') + C(516, 40, 4, 'a') + C(530, 48, 4, 'a') + C(544, 62, 4, 'a') +
      Tx(394, 30, 'голеностоп и стопа', 18, '', 'middle')),
    // 23 Advanced functional training: a figure in a tuck jump over the floor line, and a balance dome with a ball
    // tossed toward a figure standing on it.
    reset(P('M250 172H350', 'faint') + C(300, 38, 13) + P('M300 52L304 96', '', 'stroke-width="9"') +
      P('M304 96L330 84L320 116M304 96L284 82L292 114', '', 'stroke-width="8"') + P('M300 60L276 40M300 60L326 42', '', 'stroke-width="6"') +
      P('M300 140A20 8 0 0 1 300 156', 'a', 'stroke-dasharray="4 5"') +
      P('M440 172A60 26 0 0 1 560 172Z', 'a') + C(500, 92, 11) + P('M500 104L500 140L476 146M500 140L524 146', '', 'stroke-width="7"') +
      P('M500 112L528 96', '', 'stroke-width="5"') + C(580, 60, 9, 'a') + P('M572 64Q550 72 534 92', 'faint', 'stroke-dasharray="4 5"') +
      Tx(446, 28, 'продвинутая тренировка', 18, '', 'middle')),
    // 24 Exercise for the older adult: a figure rising from a chair, and a figure curling a dumbbell.
    reset(P('M236 172H580', 'faint') + P('M252 104V172M252 128H296V172', 'a') +
      C(322, 60, 12) + P('M318 72L300 120', '', 'stroke-width="9"') + P('M300 120L334 128L334 170', '', 'stroke-width="8"') +
      P('M312 84L338 106', '', 'stroke-width="6"') + P('M334 102Q360 60 330 38', 'faint', 'stroke-dasharray="4 5"') +
      C(486, 46, 12) + P('M486 58V118', '', 'stroke-width="9"') + P('M486 118L474 170M486 118L500 170', '', 'stroke-width="8"') +
      P('M486 72L490 102L510 80', '', 'stroke-width="6"') + P('M502 72L518 88', 'a', 'stroke-width="9"') +
      Tx(420, 28, 'пожилые', 18, '', 'middle')),
    // 25 Women's health: a pregnant figure from the side, and the pelvic floor as a hammock between the pubis and
    // the coccyx, lifting toward the arrow.
    reset(P('M250 172H380', 'faint') + C(316, 40, 12) + P('M314 52Q308 92 312 122', '', 'stroke-width="9"') +
      P('M318 70Q364 90 322 124', 'a', 'stroke-width="7"') + P('M314 62L326 98', '', 'stroke-width="6"') +
      P('M312 122L306 170M312 122L324 170', '', 'stroke-width="8"') +
      P('M440 64Q446 128 500 132Q554 128 560 64', 'faint') + C(448, 112, 6) + C(556, 104, 5) +
      P('M454 114Q500 158 550 106', 'a', 'stroke-width="9"') + P('M500 176V146', '', 'stroke-width="4"') + P('M492 154L500 144L508 154', '', 'stroke-width="4"') +
      Tx(420, 28, 'женское здоровье', 18, '', 'middle')),
    // 26 Lymphatic disorders: a figure with lymph nodes at the neck, the armpits and the groin and a bandaged raised arm,
    // and a lymph vessel with valves carrying the lymph on.
    reset(P('M250 172H380', 'faint') + C(310, 36, 12) + P('M310 48V118', '', 'stroke-width="9"') +
      P('M310 118L298 170M310 118L322 170', '', 'stroke-width="8"') + P('M310 62L284 104', '', 'stroke-width="6"') +
      P('M310 62L346 30', 'a', 'stroke-width="12"') + P('M318 54L326 46M326 46L334 38M334 38L342 30', '', 'stroke-width="3"') +
      C(304, 56, 3, 'a') + C(318, 66, 3, 'a') + C(302, 70, 3, 'a') + C(300, 124, 3, 'a') + C(320, 124, 3, 'a') +
      P('M440 110H570', 'a', 'stroke-width="16"') + P('M470 98L486 110L470 122M520 98L536 110L520 122', '', 'stroke-width="3"') +
      C(458, 110, 4) + C(500, 110, 4) + C(548, 110, 4) + P('M580 110L600 110', '', 'stroke-width="3"') +
      Tx(485, 28, 'лимфатические нарушения', 18, '', 'middle')),
  ];
})();
