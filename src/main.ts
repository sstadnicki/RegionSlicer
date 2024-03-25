import './style.css'
import { PolygonMesh } from './polygonMesh.ts';
import { MeshSlicer } from './meshSlicer.ts';

const WIDTH: number = 600;
const HEIGHT: number = 600;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
  <div class="buttonHolder">
  <div><button id="resetBtn">Reset</button></div>
  <span><button id="sliceBtn">Slice</button><input type="number" class="smallNum" id="numTimes" value="1"/> times</span>
  <div><input type="checkbox" id="offsetMidpoints"/>move new verts after slicing</div>
  <div class="canvasHolder">
  <canvas id="canvas" width="${WIDTH}" height="${HEIGHT}"/>
  </div>
  </div>
`;

let meshSlicer = new MeshSlicer({width: WIDTH, height: HEIGHT});
let canvas = document.getElementById('canvas') as HTMLCanvasElement;
let resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
let sliceBtn = document.getElementById("sliceBtn") as HTMLButtonElement;
let numTimesInput = document.getElementById("numTimes") as HTMLInputElement;
let offsetMidpointsInput = document.getElementById("offsetMidpoints") as HTMLInputElement;
let ctx = canvas.getContext("2d");
renderPolyMesh(ctx!, meshSlicer.mesh);
resetBtn.addEventListener("click", () => {
  meshSlicer = new MeshSlicer({width: WIDTH, height: HEIGHT});
  renderPolyMesh(ctx!, meshSlicer.mesh);
});
sliceBtn.addEventListener("click", () => {
  let numTimes: number = parseInt(numTimesInput.value);
  for (let idx = 0; idx < numTimes; idx++) {
    meshSlicer.slice(offsetMidpointsInput.checked);
  }
  renderPolyMesh(ctx!, meshSlicer.mesh);
})

function renderPolyMesh(
  ctx: CanvasRenderingContext2D,
  polyMesh: PolygonMesh
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