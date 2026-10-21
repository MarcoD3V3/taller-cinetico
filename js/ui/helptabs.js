'use strict';
// La ayuda en pestañas: nada de desplazarse por toda la ventana.
// Reparte las listas del HTML original en pestañas de dos columnas y añade la del final del juego.
(function () {
  const box = document.querySelector('#mHelp .modal-in'); if (!box) return;
  const lists = [...box.querySelectorAll('.cols > div')].map(d => ({ t: d.querySelector('.cat').textContent, items: [...d.querySelectorAll('li')].map(li => li.innerHTML) }));
  const get = t => (lists.find(l => l.t === t) || { items: [] }).items;
  const isMove = h => /^<b>(Pesca|Terreno):/.test(h), sys = get('Sistemas').filter(h => !isMove(h)), half = Math.ceil(sys.length / 2);
  const move = get('Sistemas').filter(isMove).concat([
    '<b>Moverse:</b> el personaje acelera y frena con inercia, y sus pasos van al ritmo de lo que avanza. <kbd>Shift</kbd> corre (gasta aguante); <kbd>Shift</kbd>+<kbd>Espacio</kbd>: impulso para esquivar.',
    '<b>Criaturas:</b> cada animal y enemigo tiene su carácter (veloz, cauto, curioso, perezoso, sociable…). Los animales pastan en manada, se alertan antes de huir y de noche duermen; los enemigos te rodean y los heridos se retiran.',
    '<b>Capas y montañas:</b> las montañas suben por escalones de roca; las <i>canteras</i> son planas y con más vetas. Cavar baja la casilla una capa (se ven las paredes del hoyo) y los túneles quedan al pie de la montaña. La roca que no has visto está a oscuras: se descubre al picar o al tenerla a la vista. Al mantener el clic solo se pica la capa en la que empezaste (y lo de encima, que se rebaja capa a capa hasta la tuya): para bajar más, suelta y vuelve a pulsar.',
    '<b>Curarse con las manos:</b> en la ficha (<kbd>C</kbd> › Salud) cada herida muestra sus pasos (presionar, lavar, desinfectar, coser, vendar, sacar astillas, colocar huesos…). Cada paso es una actividad: vendar dando vueltas, coser punto a punto, tirar despacio de una astilla… Hacerlo bien cura más. El material (gasas, alcohol, hilo y aguja, pinzas, jeringa…) se fabrica en el bolsillo. Protector solar y repelente previenen quemaduras y picaduras.',
    '<b>Cocina y hogar:</b> pan, guisos, tartas y bebidas con efectos (calor, calma, vigor, regeneración, visión nocturna…); muebles y adornos que dan luz o calor y abaratan a los NPC; accesorios que protegen del sol, los insectos, el frío o las caídas.',
    '<b>Clima:</b> cambia según el bioma y los ajustes del mundo (lluvia, tormenta con rayos, nieve, ventisca, ola de calor, tormenta de arena, niebla, ceniza, esporas). Mojado tienes más frío; la ventisca y la arena frenan; en la niebla te ven menos; con mal tiempo los animales se refugian y los enemigos se crecen. Dentro de los túneles de la montaña está oscuro: pon antorchas (alumbran y descubren la roca).',
    '<b>Heridas que evolucionan:</b> sin curar empeoran si corres con una fractura, trabajas con un corte, te acercas al fuego con una quemadura o dejas una infección (se agrava y da fiebre). Reposar, comer y beber bien las mejoran. La ficha dice si cada herida mejora o empeora y por qué.',
    '<b>Cursor:</b> deja el ratón quieto sobre cualquier cosa para ver su tarjeta: vida, estado y carácter de las criaturas, energía y contenido de las máquinas, altura del terreno, qué sale al picar y qué peces pican en esa agua.',
  ]);
  const TABS = [
    ['⌨ Controles', get('Controles')],
    ['🎒 Inventario y banco', get('Inventario y banco')],
    ['⚙ Sistemas', sys.slice(0, half)],
    ['⚔ Mundo y combate', sys.slice(half)],
    ['🎣 Movimiento y pesca', move],
    ['🏛 Durabilidad y final', [
      '<b>Durabilidad:</b> picos, hachas, palas, armas, armaduras, escudos y guantes se gastan con el uso. La barra bajo el icono pasa de verde a rojo y el tooltip dice cuántos usos quedan. Al llegar a cero, la pieza se rompe.',
      '<b>Reparar:</b> <i>Piedra de afilar</i> (30 % a herramientas y armas), <i>Kit de reparación</i> (50 % a la pieza más gastada) y <i>Esencia restauradora</i> (todo como nuevo). Se usan con <kbd>F</kbd>.',
      '<b>El Núcleo:</b> es la última Chispa del Corazón del Mundo. Cada nivel que completas le hace recordar; es también tu punto de regreso. No se puede quitar.',
      '<b>La Ciudadela del Primer Engranaje:</b> al completar los 8 niveles, el Núcleo despierta y la marca en tu mapa. Está lejos, en tierra firme.',
      '<b>Los Ocho Sellos:</b> los guardan ocho Guardianes (Yeti Ancestral, Faraón Momia, Hidra del Pantano, Ent Primigenio, Draco Anciano, Liche, Titán de Tormenta y Devorador del Vacío). Colócalos con <kbd>F</kbd> en los pedestales de la Ciudadela.',
      '<b>La Puerta del Ocaso:</b> con los 8 sellos y el Núcleo despierto se abre. Al otro lado espera el Corazón del Mundo… y lo que se lo está comiendo. Al final elegirás su destino.',
      '<b>Crónicas</b> (<kbd>J</kbd>): la historia de los Forjadores. Se desbloquea leyendo <i>Tablillas</i> (piedras rúnicas de los santuarios, escombros de la Ciudadela), subiendo de nivel y venciendo Guardianes.',
      '<b>Razas y personalidad:</b> al crear el personaje eliges raza (12), profesión y personalidad (12). Todo se combina y cambia números reales del juego; la armadura se adapta a cada cuerpo.',
    ]],
    ['🚀 Primeros pasos', get('Primeros pasos')],
  ];
  const intro = box.querySelector(':scope > p');
  box.querySelectorAll('.cols').forEach(c => c.remove());
  const bar = document.createElement('div'); bar.className = 'mtabs helptabs';
  bar.innerHTML = TABS.map(([n], i) => `<button data-ht="${i}" class="${i ? '' : 'on'}">${n}</button>`).join('');
  const body = document.createElement('div'); body.className = 'helpbody';
  const show = i => { body.innerHTML = `<ul class="hcols">${TABS[i][1].map(h => `<li>${h}</li>`).join('')}</ul>`; bar.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i)); };
  (intro || box.firstElementChild).after(bar); bar.after(body); show(0);
  bar.addEventListener('click', e => { const b = e.target.closest('[data-ht]'); if (b) show(+b.dataset.ht); });
})();
