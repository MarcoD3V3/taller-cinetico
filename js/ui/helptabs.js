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
    ['🌾 Huerto', [
      '<b>1 · Semillas:</b> rompe <i>hierba alta</i>, flores o hierbas del campo: a veces sueltan semillas (casi siempre de trigo, y a veces de lo que crece en ese bioma). Las plantas silvestres de cada cultivo (trigo silvestre, zanahoria silvestre…) siempre dan semillas.',
      '<b>2 · Azada:</b> fabrica una <i>Azada de madera</i> (palos y tablones) y haz clic en hierba o tierra: queda <i>tierra de cultivo</i>.',
      '<b>3 · Agua:</b> la tierra de cultivo a 4 casillas o menos de agua se riega sola y lo sembrado crece un 25 % más rápido, como en Minecraft. Lejos del agua usa una <i>Regadera</i> o espera a que llueva. Seca crece a ¼ (el arroz no crece seco).',
      '<b>4 · Sembrar:</b> lleva las semillas en la mano y haz clic en la tierra de cultivo. Crece en 4 etapas: semilla, brote, creciendo y madura (con frutos de color).',
      '<b>5 · Cosechar:</b> cuando esté madura, pulsa <kbd>F</kbd> encima o rómpela: te da la cosecha y 1–2 semillas para volver a sembrar. Tomate, fresa, uva, pimiento… rebrotan solos.',
      '<b>Más rápido:</b> <i>Harina de hueso</i> sube una etapa al momento; el <i>Compost</i> ×1,5 y el <i>Superabono</i> ×2. La <i>Lámpara de cultivo</i> hace crecer también de noche. Cada cultivo crece algo mejor en su bioma.',
    ]],
    ['⚙ Automatizar', [
      '<b>La idea:</b> todo se puede hacer a mano (picar, talar, sembrar, fabricar en mesas) o con máquinas que trabajan solas. Las máquinas necesitan <i>giro</i> (ejes desde una rueda, molino o motor) y cuanto más valioso es lo que buscas, más giro, más piezas y más pasos hacen falta.',
      '<b>Madera:</b> planta <i>plantones</i> (salen al talar árboles): en unos 7 minutos son árboles, antes con agua cerca. Un <i>plantador automático</i> los planta y un <i>talador automático</i> (≥16 RPM) los corta cuando han crecido y saca los troncos por detrás hacia una cinta.',
      '<b>Cultivos:</b> la <i>cosechadora automática</i> (≥16 RPM) recoge lo maduro en 3×3 delante de ella, vuelve a sembrar y saca la cosecha por detrás. Con aspersores, el huerto se cuida solo.',
      '<b>Minerales:</b> el taladro va encima de la veta y las vetas se agotan. <i>Taladro mecánico</i>: piedra, arena, carbón, cobre. <i>Taladro reforzado</i> (≥32 RPM): hierro y menas medias. <i>Perforadora industrial</i> (≥64 RPM + lubricante): oro, plata y menas valiosas. <i>Perforadora de núcleo</i> (≥128 RPM + lubricante + brocas): lo más raro.',
      '<b>Procesar:</b> lo que sale es mena en bruto. Para lingotes: trituradora → lavadora de menas → horno, enlazados con cintas. Las mesas industriales convierten lingotes en hojas, eslabones, armas…',
      '<b>Almacén central:</b> 108 ranuras. Lleva ahí todas tus cintas (con clasificadores y embudos para repartir) y tendrás todo en un sitio.',
    ]],
    ['🕳 Profundidades', [
      '<b>Bajar:</b> cava un hoyo hasta el fondo y pica ese fondo: se abre un <i>pozo</i>. Salta dentro con <kbd>Espacio</kbd> y caes a la capa de abajo (con una <i>Cuerda</i> en el inventario, sin hacerte daño). Con una <i>Escalera de mano</i> sobre el pozo bajas tranquilo y la escalera llega hasta el fondo.',
      '<b>Subir:</b> pon una <i>Escalera de mano</i> bajo tierra y úsala (clic derecho): abres un hueco en el techo y sales a la capa de arriba. También puedes volver por donde bajaste. Si arriba hay agua, ácido o lava, primero lo notas (te avisa) y, si insistes, te cae encima.',
      '<b>Escalar sin escalera:</b> bajo el pozo por el que caíste (o en un hoyo del que no sales saltando), quédate quieto y pulsa <kbd>Espacio</kbd> para escalar (si te mueves mientras pulsas, saltas: así entras en un pozo de al lado). Es un reto de unos 20 s, uno de 10 distintos: elegir presas, tres apoyos, antebrazos, lances, chimenea, asegurar la cuerda, fisura, desprendimientos, respirar contra el vértigo y leer la vía. Cuanto más honda la capa, más difícil (roca mojada, frío, esporas, roca ardiente, oscuridad). Si se te acaba el agarre caes y te haces daño; los guantes y la forma física ayudan.',
      '<b>Lo de arriba se nota abajo:</b> bajo los lagos y el mar hay agua; bajo la lava de una capa suele haber lava en la siguiente. Cada casilla de una capa está justo debajo de la misma casilla de la capa de arriba.',
      '<b>Capa 1 · Cavernas húmedas (−2 a −5):</b> roca de caverna, agua fría, carbón, hierro, cobre y estaño. Murciélagos, reptadores del barro, arañas y limos.',
      '<b>Capa 2 · Grutas de cristal (−6 a −9):</b> pizarra profunda (pico de piedra o mejor), frío, cristales que brillan, oro, plata, cobalto y geodas. Arañas de cristal y gólems de geoda.',
      '<b>Capa 3 · Ciénaga de esporas (−10 a −13):</b> esporas tóxicas en el aire (equipa una <i>Máscara de filtro</i>), grietas tóxicas, lagos de ácido, uranio y platino. Esporosos que explotan y gusanos ácidos.',
      '<b>Capa 4 · Entrañas ígneas (−14 a −17):</b> 47 °C y lagos de lava que queman si te pegas a ellos (<i>Pócima ignífuga</i> o <i>Capa ignífuga</i>). Wolframio, obsidiana, mithril y adamantita. Babosas de magma y demonios de ceniza.',
      '<b>Capa 5 · Abismo primigenio (−18 a −21):</b> casi a oscuras y te roba las fuerzas (<i>Amuleto abisal</i>). Las menas más raras del mundo, acechadores del vacío y horrores abisales. Debajo está la <i>roca madre</i>: el fondo de todo.',
      '<b>Más abajo, más difícil:</b> la roca es más dura (picas más despacio y pide mejor pico), hay menos luz y los monstruos tienen mucha más vida. Lleva luz: el <i>Farol de liquen</i> alumbra sin gastar y cerca de la luz no aparecen monstruos.',
    ]],
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
