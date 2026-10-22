'use strict';
// =====================================================================================
//  Ayuda de cada estado (hambre, herido, frío, enfermedad…): al pasar el ratón por un
//  estado, en la ficha o en el HUD, explica qué es, por qué te pasa, qué hacer y otras
//  formas de arreglarlo, con lo que llevas encima que sirve. Y en Salud, la vida general.
// =====================================================================================
const mhHave = (test, max = 5) => { const seen = new Map(); for (const s of S.inv) if (s && ITEMS[s.id] && test(ITEMS[s.id], s.id)) seen.set(s.id, (seen.get(s.id) || 0) + s.n); return [...seen].slice(0, max); };
const mhList = list => list.length ? `<div class="mhhave">${list.map(([id, n]) => `<span>${itemImg(id, 16)} ${esc(ITEMS[id].n)} <b>×${n}</b></span>`).join('')}</div>` : '';
const mhOk = (ok, t) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${t}</li>`;
// Por qué no se recupera la vida sola (las mismas condiciones que usa el juego)
function mhRegen() {
  const pc = S.pc, cold = pc.temp < 35.5;
  return `<ul class="mhchk">${mhOk(pc.food > 40, 'Hambre por encima del 40 %')}${mhOk(pc.water > 40, 'Sed por encima del 40 %')}${mhOk(!bleedOf(), 'Sin sangrar')}${mhOk(!(pc.poison > 0), 'Sin veneno')}${mhOk(!cold, 'Sin frío (temperatura ≥ 35,5 °C)')}${mhOk(!(typeof infected === 'function' && infected()), 'Sin heridas infectadas')}${mhOk(pc.energy > 20, 'Descansado (energía > 20 %): si no, la mitad de rápido')}</ul>`;
}
const MH = {
  '❤': x => ({ t: `Vida general: ${Math.round(S.pc.hp)} / ${Math.round(maxHp())}`,
    why: 'Es tu vida total, no la de cada parte del cuerpo: por eso la pestaña Salud puede tener todas las partes al 100 % y aun así estar «herido». Baja con golpes, caídas, hambre o sed a cero, frío extremo, veneno, sangrado e infecciones.',
    how: ['Se recupera sola poco a poco si se cumple todo esto:' + mhRegen(), '<b>Come algo que cure</b> (en su ficha pone «Vida +»):' + mhList(mhHave(it => it.food && it.food.hp > 0)), '<b>Duerme en una cama</b> (F sobre ella de noche): recuperas vida mientras duermes.'],
    alt: ['Pociones y remedios de curación del recetario (busca «curación»).', 'Quédate en casa bajo techo y junto a una hoguera: sin frío ni enemigos te recuperas antes.', 'Evita pelear hasta recuperarte; aléjate de los enemigos.'] }),
  '🍖': () => ({ t: 'Hambre', why: 'Se gasta con el tiempo, más rápido si corres, trabajas o hace frío. Por debajo del 40 % no recuperas vida; a cero, la pierdes.',
    how: ['<b>Come</b>: lleva la comida en la mano y pulsa F (o «Comer» en la ficha).' + mhList(mhHave(it => it.food && it.food.f > 0).sort((a, b) => ITEMS[b[0]].food.f - ITEMS[a[0]].food.f))],
    alt: ['Caza animales y cocina la carne en una hoguera u horno (cruda puede sentarte mal).', 'Bayas de los arbustos, setas y frutas del bosque.', 'Siembra un huerto (Ayuda › 🌾 Huerto): trigo para pan, patatas, zanahorias…', 'Pesca con una caña en ríos, lagos o el mar.'] }),
  '💧': () => ({ t: 'Sed', why: 'Se gasta más deprisa con calor, corriendo o con fiebre. Por debajo del 40 % no recuperas vida; a cero, la pierdes.',
    how: ['<b>Bebe</b>: con la bebida en la mano pulsa F.' + mhList(mhHave(it => it.food && it.food.w > 0).sort((a, b) => ITEMS[b[0]].food.w - ITEMS[a[0]].food.w))],
    alt: ['Llena una botella en un río o lago y hiérvela para que sea segura.', 'Frutas con mucha agua: sandía, tomate, uvas…', 'Zumos, sopas y té también quitan sed.', 'Evita el sol fuerte: bajo techo se suda menos.'] }),
  '😴': () => ({ t: 'Cansancio', why: 'La energía baja con las horas despierto y al trabajar. Muy cansado trabajas y te curas más despacio; agotado pierdes vida.',
    how: ['<b>Duerme en una cama</b> (F sobre ella, mejor de noche y sin enemigos cerca).'],
    alt: ['Café o té: quitan cansancio un buen rato.', 'Comida con efecto «Veloz» o «Calma».', 'Descansa quieto junto a una hoguera.'] }),
  '💨': () => ({ t: 'Sin aliento', why: 'El aguante se gasta al correr, esquivar y saltar.', how: ['Deja de correr unos segundos: se rellena solo.'], alt: ['Comer y estar descansado hace que se recupere antes.', 'El atributo de forma física y algunos rasgos dan más aguante.'] }),
  '🩸': () => ({ t: 'Sangrado', why: 'Una herida abierta (corte, mordisco…) te quita vida sin parar y no dejas de sangrar solo.',
    how: ['<b>Venda la herida</b>: ficha (C) › Salud › toca la herida y sigue los pasos (presionar, limpiar, vendar).' + mhList(mhHave((it, id) => /bandage|gauze|tourniquet|medkit|plaster/i.test(id)))],
    alt: ['Torniquete o cauterizar si es muy grave.', 'Miel en la herida (cura de miel) si no tienes vendas.', 'Mientras tanto, no corras: sangras más.'] }),
  '🤕': () => ({ t: 'Dolor', why: 'Lo causan las heridas, fracturas y quemaduras. Con mucho dolor eres más lento y trabajas peor.',
    how: ['<b>Cura las heridas</b> en la ficha (C) › Salud: el dolor baja al curarlas.', '<b>Toma un calmante</b>.' + mhList(mhHave((it, id) => /painkiller|morphine|willow/i.test(id)))],
    alt: ['Té de hierbas y descanso.', 'Dormir en una cama.'] }),
  '🦴': () => ({ t: 'Fractura', why: 'Un hueso roto: duele, te frena y empeora si corres o trabajas con él.',
    how: ['<b>Entablilla</b>: ficha (C) › Salud › toca la fractura y coloca la férula.' + mhList(mhHave((it, id) => /splint/i.test(id)))],
    alt: ['Fabrica una férula con palos y tela en el banco.', 'Descansa y no corras hasta que se cure.'] }),
  '🌡': () => ({ t: 'Infección', why: 'Una herida sucia sin limpiar se infecta: da fiebre y te impide recuperar vida.',
    how: ['<b>Cataplasma o antibiótico</b> sobre la herida (ficha › Salud).' + mhList(mhHave((it, id) => /poultice|antibiotic|iodine|alcohol/i.test(id)))],
    alt: ['Limpia y desinfecta las heridas nuevas para que no se infecten.', 'Miel en la herida ayuda.'] }),
  '🤢': () => ({ t: 'Veneno o intoxicación', why: 'Por mordiscos venenosos, comida cruda o en mal estado, o plantas tóxicas. Mientras dura pierdes vida.',
    how: ['<b>Toma un antídoto</b>.' + mhList(mhHave((it, id) => /antidote|charcoal|milk/i.test(id)))],
    alt: ['Espera a que pase sin pelear, comido y bebido.', 'Cocina siempre la carne y el pescado.'] }),
  '🥶': () => ({ t: `Frío · ${S.pc.temp.toFixed(1).replace('.', ',')} °C`, why: 'El ambiente está frío (noche, nieve, agua, viento) y te enfrías; con hipotermia pierdes vida.',
    how: ['<b>Ponte junto a una hoguera</b>: cuanto más cerca y más intensa, más calor (ficha de la hoguera).', '<b>Ropa de abrigo</b> en el equipo: abrigos, capas, gorros…'],
    alt: ['Métete en casa con techo: no llueve dentro.', 'Sécate: mojado tienes mucho más frío.', 'Comida y bebida calientes (sopas, té, chile).', 'Una antorcha o lámpara en la mano no calienta: busca fuego de verdad.'] }),
  '🥵': () => ({ t: 'Calor', why: 'Hace mucho calor: tienes más sed y te cansas antes.', how: ['Bebe a menudo y lleva agua contigo.'], alt: ['Quédate a la sombra o bajo techo.', 'Ropa ligera o equipo que proteja del calor.', 'Báñate en el agua.'] }),
};
function mhIll(x) {
  const D = Object.values(ILLS).find(d => x.n.startsWith(d.n + ':')); if (!D) return null;
  const cures = (D.cure || []).filter(([id]) => ITEMS[id]);
  return { t: D.n, why: `${D.sym}.${D.next ? ` Si no te cuidas puede empeorar (${esc(D.next[2] || 'se complica')}).` : ''}`,
    how: [cures.length ? `<b>Remedios</b>: ${cures.map(([id, k]) => `${esc(ITEMS[id].n)}${k ? ` <span class="mut">(${Math.round(k * 100)} %)</span>` : ''}`).join(' · ')}` + mhList(mhHave((it, id) => cures.some(c => c[0] === id))) : 'Descansa, come y bebe bien: se pasa con el tiempo.'],
    alt: ['Duerme en una cama y abrígate.', 'Come y bebe caliente; no te mojes.'] };
}
function moodHelp(x) {
  const f = MH[x.i]; const H = f ? f(x) : mhIll(x); if (!H) return '';
  return `<b class="mht">${x.i} ${H.t}</b><p class="mhw">${H.why}</p><div class="mhs">Qué hacer</div><ul class="mhl">${H.how.map(t => `<li>${t}</li>`).join('')}</ul>${H.alt && H.alt.length ? `<div class="mhs">Otras formas</div><ul class="mhl alt">${H.alt.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}`;
}
let _moodLast = [];
{ const m0 = moodles; moodles = () => { const out = m0(); _moodLast = out; return out; }; }
// Al pasar el ratón por un estado (ficha o HUD)
document.addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('.csmoo .csch, #moodles .moo'); if (!el || !S || !S.pc) return;
  const box = el.parentNode, i = [...box.children].indexOf(el), m = moodles()[i]; if (!m || m.good) return;
  el.removeAttribute('title'); const h = moodHelp(m); if (!h) return;
  const t = $('tip'); t.innerHTML = h; t.classList.add('tiphelp'); t.classList.remove('tipmini'); t.hidden = false;
  const r = el.getBoundingClientRect(), right = r.left > innerWidth - 380, below = r.top < 340;
  t.style.transform = `translate(${right ? r.right : r.left}px,${below ? r.bottom + 8 : r.top - 8}px) translate(${right ? '-100%' : '0'},${below ? '0' : '-100%'})`;
});
document.addEventListener('mouseout', e => { const el = e.target.closest && e.target.closest('.csmoo .csch, #moodles .moo'); if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return; const t = $('tip'); if (t.classList.contains('tiphelp')) { t.hidden = true; t.classList.remove('tiphelp'); } });
// Salud: la vida general arriba, con lo que la está frenando
setInterval(() => {
  const w = document.querySelector('.cshr .csparts') || document.getElementById('chWounds'); if (!w || !S || !S.pc) return;
  const pc = S.pc, f = pc.hp / maxHp(); let el = document.getElementById('chLife');
  if (!el) { el = document.createElement('div'); el.id = 'chLife'; w.before(el); }
  const sig = Math.round(f * 100) + '|' + mhRegen(); if (el._s === sig) return; el._s = sig;
  el.innerHTML = f >= 0.999 ? '' : `<div class="chlife ${f < 0.25 ? 'bad' : f < 0.5 ? 'warn' : ''}"><div><b>❤ Vida general ${Math.round(pc.hp)} / ${Math.round(maxHp())}</b><span class="mut small">Es tu vida total (no la de cada parte). ${f < 0.25 ? 'Gravemente herido: ' : ''}así se recupera sola:</span></div>${mhRegen()}<span class="mut small">Más rápido: dormir en una cama o comida que cure. Pasa el ratón por «${f < 0.25 ? 'Gravemente herido' : f < 0.5 ? 'Herido' : 'Magullado'}» en Estado para ver todas las opciones.</span></div>`;
}, 400);
