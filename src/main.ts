import './style.css'
import { PolygonMesh } from './polygonMesh.ts';
import { MeshSlicer } from './meshSlicer.ts';

const DEFAULT_WIDTH: number = 600;
const DEFAULT_HEIGHT: number = 600;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div class="buttonHolder">
      <div>
        Width:<input type="number" class="smallNum" id="widthInput" value="${DEFAULT_WIDTH}"/>
        Height:<input type="number" class="smallNum" id="heightInput" value="${DEFAULT_HEIGHT}"/>
      <div><button id="resetBtn">Reset</button></div>
      <span><button id="sliceBtn">Slice</button><input type="number" class="smallNum" id="numTimes" value="1"/> times</span>
      <div><input type="checkbox" id="offsetMidpoints"/>move new verts after slicing</div>
    </div>
    <div class="canvasHolder">
      <canvas id="canvas" width="${DEFAULT_WIDTH}" height="${DEFAULT_HEIGHT}"/>
    </div>
    <div class="exportButtonHolder">
      <button id="exportBtn">Export SVG</button>
    </div>
    <div class="svgHolder" id="svgDiv">
    </div>
  </div>
`;

let canvas = document.getElementById('canvas') as HTMLCanvasElement;
let resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
let sliceBtn = document.getElementById("sliceBtn") as HTMLButtonElement;
let exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;
let numTimesInput = document.getElementById("numTimes") as HTMLInputElement;
let widthInput = document.getElementById("widthInput") as HTMLInputElement;
let heightInput = document.getElementById("heightInput") as HTMLInputElement;
let offsetMidpointsInput = document.getElementById("offsetMidpoints") as HTMLInputElement;
//let svgHolderDiv = document.getElementById("svgDiv") as HTMLDivElement;
let ctx = canvas.getContext("2d");
let meshSlicer = new MeshSlicer({width: canvas.width, height: canvas.height});
renderPolyMesh(ctx!, meshSlicer.mesh);
resetBtn.addEventListener("click", () => resetMesh(ctx!));
sliceBtn.addEventListener("click", () => {
  let numTimes: number = parseInt(numTimesInput.value);
  for (let idx = 0; idx < numTimes; idx++) {
    meshSlicer.slice(offsetMidpointsInput.checked);
  }
  renderPolyMesh(ctx!, meshSlicer.mesh);
});
widthInput.addEventListener('change', () => resetMesh(ctx!));
heightInput.addEventListener('change', () => resetMesh(ctx!));
exportBtn.addEventListener("click", () => {
  const svgOutput = meshSlicer.mesh.generateSVG();
  const serializer = new XMLSerializer();
  const outStr = serializer.serializeToString(svgOutput);
  const blob = new Blob([outStr], {type: 'image/svg+xml'});
  let fauxLink = document.createElement('a') as HTMLAnchorElement;
  document.body.append(fauxLink);
  fauxLink.style.setProperty('display', 'none');
  let blobURL = window.URL.createObjectURL(blob);
  fauxLink.href = blobURL;
  fauxLink.download = 'slicerOutput.svg';
  fauxLink.click();
  window.URL.revokeObjectURL(blobURL);
});

function resetMesh (ctx: CanvasRenderingContext2D) {
  let width = parseInt(widthInput!.value);
  let height = parseInt(heightInput!.value);
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  meshSlicer = new MeshSlicer({width: width, height: height});
  renderPolyMesh(ctx, meshSlicer.mesh);
}

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