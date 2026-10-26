'use strict';
// =====================================================================================
//  Cubetas (la lógica en sim/buckets.js):
//   · Cubeta de madera: coge y vierte agua. Cubeta de hierro: agua y también lava.
//   · Llena de agua se puede beber (agua sin hervir: a veces sienta mal) y devuelve la cubeta.
// =====================================================================================
const BUCKET_CAT = ITEMS.planks ? ITEMS.planks.cat : 0;
IT('woodBucket', 'Cubeta de madera', '#9a7448', 'potion', BUCKET_CAT, 'Clic en el agua para llenarla; clic en el suelo para verterla. No aguanta la lava.');
IT('woodBucketWater', 'Cubeta de madera con agua', '#4aa8ec', 'potion', BUCKET_CAT, 'Clic en el suelo: viertes el agua. En tierra de cultivo, la riega (3×3). Úsala (F) para beber.');
IT('bucket', 'Cubeta de hierro', '#b8bcc4', 'potion', BUCKET_CAT, 'Coge agua o lava con un clic; clic en el suelo para verterla.');
IT('bucketWater', 'Cubeta de agua', '#4aa8ec', 'potion', BUCKET_CAT, 'Clic en el suelo: viertes el agua. En tierra de cultivo, la riega (3×3). Úsala (F) para beber.');
IT('bucketLava', 'Cubeta de lava', '#ff6a1a', 'potion', BUCKET_CAT, 'Clic en el suelo: viertes la lava. ¡Cuidado, quema!');
ITEMS.woodBucketWater.food = { w: 30, raw: 0.12, back: 'woodBucket' };
ITEMS.bucketWater.food = { w: 30, raw: 0.12, back: 'bucket' };
const BUCKETS = { woodBucket: { water: 'woodBucketWater' }, bucket: { water: 'bucketWater', lava: 'bucketLava' } };
const BUCKET_FULL = { woodBucketWater: ['woodBucket', 'water'], bucketWater: ['bucket', 'water'], bucketLava: ['bucket', 'lava'] };
RB('woodBucket', 1, 'planks', 'planks*2,rope');
RB('bucket', 1, '@iron.plate', '@iron.plate*2,@iron.nugget');
