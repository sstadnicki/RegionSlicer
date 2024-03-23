import './style.css'
import { Vector2 } from './vector.ts';
import { PolygonMesh } from './polygonMesh.ts';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
  <div class="canvasHolder">
  <canvas id="canvas" width="800" height="800"/>
  </div>
  </div>
`;

function randomColor(): Color {
  return [
    Math.floor(256*Math.random()),
    Math.floor(256*Math.random()),
    Math.floor(256*Math.random()),
  ];
}

type Color = [number, number, number];
let polyMesh = new PolygonMesh(new Vector2([0, 0]), new Vector2([800, 800]));
let colors: Array<Color> = [];
let canvas = document.getElementById('canvas') as HTMLCanvasElement;
let ctx = canvas.getContext("2d");
colors.push(randomColor());
renderPolyMesh(ctx!, polyMesh, colors);
window.addEventListener("keydown", (evt) => {
  if (evt.key == " ") {
    let randomIdx = Math.floor(polyMesh.polygons.length * Math.random());
    let poly = polyMesh.polygons[randomIdx];
    let edgeCount = poly.length;
    let edge0Idx = Math.floor(edgeCount * Math.random());
    let edge1Idx: number;
    do {
      edge1Idx = Math.floor(edgeCount * Math.random());
    } while (edge1Idx == edge0Idx);
    console.log(`Splitting poly ${randomIdx} between edges ${edge0Idx}, ${edge1Idx}`);
    polyMesh.splitPolygon(poly, edge0Idx, edge1Idx);
    colors.push(randomColor());
    renderPolyMesh(ctx!, polyMesh, colors);
  }
});

function renderPolyMesh(
  ctx: CanvasRenderingContext2D,
  polyMesh: PolygonMesh,
  colors: Array<Color>
): void {
  polyMesh.polygons.forEach((poly, polyIdx) => {
    let path = new Path2D();
    poly.forEach((orEdge, edgeIdx) => {
      let vtx = polyMesh.vertices[orEdge.edge.indices[orEdge.orientation]];
      if (edgeIdx == 0)
        path.moveTo(vtx.data[0], vtx.data[1]);
      else
        path.lineTo(vtx.data[0], vtx.data[1]);
    });
    path.closePath();
    /*
    ctx.fillStyle = `rgb(
      ${colors[polyIdx][0]}
      ${colors[polyIdx][1]}
      ${colors[polyIdx][2]}
    )`;
    */
    ctx.fillStyle = `hsl(
      ${(223*polyIdx)%360}
      80%
      50%
    )`;
    ctx.fill(path);
  });
}