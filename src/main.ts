import './style.css'
import { PolygonMesh } from './polygonMesh.ts';
import { MeshSlicer } from './meshSlicer.ts';

const WIDTH: number = 600;
const HEIGHT: number = 600;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
  <div class="canvasHolder">
  <canvas id="canvas" width="${WIDTH}" height="${HEIGHT}"/>
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
let meshSlicer = new MeshSlicer({width: WIDTH, height: HEIGHT});
let colors: Array<Color> = [];
let canvas = document.getElementById('canvas') as HTMLCanvasElement;
let ctx = canvas.getContext("2d");
colors.push(randomColor());
renderPolyMesh(ctx!, meshSlicer.mesh, colors);
window.addEventListener("keydown", (evt) => {
  if (evt.key == " ") {
/*
    let randomIdx = Math.floor(meshSlicer.polyMesh.polygons.length * Math.random());
    let poly = meshSlicer.polyMesh.polygons[randomIdx];
    let edgeCount = poly.length;
    let edge0Idx = Math.floor(edgeCount * Math.random());
    let edge1Idx: number;
    do {
      edge1Idx = Math.floor(edgeCount * Math.random());
    } while (edge1Idx == edge0Idx);
    console.log(`Splitting poly ${randomIdx} between edges ${edge0Idx}, ${edge1Idx}`);
    polyMesh.splitPolygon(poly, edge0Idx, edge1Idx);
*/
    meshSlicer.slice();
    colors.push(randomColor());
    renderPolyMesh(ctx!, meshSlicer.mesh, colors);
  }
});

function renderPolyMesh(
  ctx: CanvasRenderingContext2D,
  polyMesh: PolygonMesh,
  _: Array<Color>
): void {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "black";
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
      ${(223*polyIdx)%360},
      ${25+(31*polyIdx)%75}%,
      50%
    )`;
    ctx.stroke(path);
    ctx.fill(path);
  });
}