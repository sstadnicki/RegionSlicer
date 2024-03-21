import './style.css'
import { Vector2 } from './vector.ts';
import { Polygon } from './polygon.ts';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
  <div class="canvasHolder">
  <canvas width="800" height="600"/>
  </div>
  </div>
`;

let poly: Polygon = new Polygon([
  new Vector2(0, 0),
  new Vector2(2, 0),
  new Vector2(1, 1),
  new Vector2(0, 1)
]);
let area: number = poly.area();
console.log(`area of the polygon is ${area}`);
