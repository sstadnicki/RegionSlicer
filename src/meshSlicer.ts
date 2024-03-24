import { Vector2 } from "./vector";
import { Polygon } from "./polygon";
import { IndexedPolygon, PolygonMesh } from "./polygonMesh";

// An IndexChoiceFunction is a function for choosing a single element
// out of an array, generally an array of the 'best N' options
type IndexChoiceFunction = (_: Array<number>) => number;

// a collection of simple IndexChoiceFunctions
const IndexChoiceFunctions = {
  // Just choose the 'best' element
  topElement: (_: Array<number>) => {
    return 0;
  },

  // randomly choose one of the best N
  randomElement: (arr: Array<number>) => {
    return Math.floor(arr.length * Math.random());
  },

  // choose one of the best N, weighted by score.
  weightedRandomElement: (arr: Array<number>) => {
    let totalWeight = arr.reduce((a,b) => a+b);
    let randomVal = totalWeight * Math.random();
    let idx = 0;
    while (randomVal > arr[idx]) {
      randomVal -= arr[idx];
      idx++;
    }
    return idx;
  }
};

// Similarly, a MultipleIndicesChoiceFunction is a way of choosing m items
// out of an array of 'best N' options.
type MultipleIndicesChoiceFunction = (_: Array<number>, numItems: number) => Array<number>;

// Likewise, a collection of MultipleIndicesChoiceFunctions
const MultipleIndicesChoiceFunctions = {
  topElements: (_: Array<number>, numItems: number) => {
    return [...Array(numItems).keys()];
  },

  randomElements: (arr: Array<number>, numItems: number) => {
    let totalNumItems = arr.length;
    let outArr: Array<number> = [];
    arr.forEach((_, idx) => {
      if ((numItems - outArr.length) < (totalNumItems-idx) * Math.random())
        outArr.push(idx);
    });
    return outArr;
  },

  // There should be a better way of doing this, but I don't know it. :/
  weightedRandomElements: (arr: Array<number>, numItems: number) => {
    let outArr: Array<number> = [];
    for (let idx = 0; idx < numItems; idx++) {
      let newItem = -1;
      do {
        newItem = IndexChoiceFunctions.weightedRandomElement(arr);
      } while (outArr.indexOf(newItem) >= 0);
    }
    return outArr;
  }
}
// Helper class for keeping the top N of something by score, and then randomly
// selecting one (or more) of those N according to selection rules.

class TopN<ObjType extends object> {

  topNArray: Array<{obj: ObjType, val: number}>;  
  size: number;
  // by default we use top-of-list as a selection function
  selectionFunction: IndexChoiceFunction = IndexChoiceFunctions.topElement;
  // And likewise top-n as a multiselection function
  multiSelectFunction: MultipleIndicesChoiceFunction = MultipleIndicesChoiceFunctions.topElements;

  constructor(size: number) {
    this.topNArray = [];
    this.size = size;
  }

  public insert(newObj: ObjType, newValue: number) {
    // Figure out where this item will go in our top-N list
    let ranking = this.topNArray.findLastIndex((elem) => (elem.val > newValue));
    // if it's not at the end of the list, then insert it there
    if (ranking < this.size-1) {
      this.topNArray.splice(ranking+1, 0, {obj: newObj, val: newValue});
      this.topNArray.splice(this.size);
    }
  }

  public select(): ObjType {
    let numArray: Array<number> = this.topNArray.map((elem) => elem.val);
    return this.topNArray[this.selectionFunction(numArray)].obj;
  }

  public multiSelect(numItems: number): Array<ObjType> {
    let numArray: Array<number> = this.topNArray.map((elem) => elem.val);
    return this.multiSelectFunction(numArray, numItems).map((idx) => this.topNArray[idx].obj);
  }

  public getRankedObject(rank: number): ObjType {
    return this.topNArray[rank].obj;
  }
}

type SlicerConstructorParams = {
  width: number,
  height: number
};

export class MeshSlicer {

  mesh: PolygonMesh;
  // The 'fuzz factor' for blurring polygon evaluation (i.e. area); we multiply by a random
  // number between 1/fuzzFactor and fuzzFactor. (More accurately, the exponential of a random
  // number between -log(fuzzFactor) and log(fuzzFactor))
  polygonAreaFuzzFactor: number = 1.5;
  // Similarly, a fuzz factor for blurring edge evaluation.
  edgeLengthFuzzFactor: number = 2;
  // We also choose our 'midpoints' within a random region on the edge, centered on the midpoint
  // with width midpointRandomRange
  midpointRandomRange: number = 0.2;

  constructor(params: SlicerConstructorParams) {
    this.mesh = new PolygonMesh(new Vector2(), new Vector2(params.width, params.height));
  }

  getFuzzValue(fuzzFactor:number): number {
    let fuzzLog = Math.log(fuzzFactor);
    let randVal = fuzzLog*(2*Math.random()-1);
    return Math.exp(randVal);
  }

  slice() {
    let poly=this.selectPolygon();
    let edges: [number, number] = this.selectEdges(poly);
    let edge0RandomMidpoint = Math.random()*this.midpointRandomRange + (1-this.midpointRandomRange)/2;
    let edge1RandomMidpoint = Math.random()*this.midpointRandomRange + (1-this.midpointRandomRange)/2;
    this.mesh.splitPolygon(poly, edges[0], edges[1], edge0RandomMidpoint, edge1RandomMidpoint);
  }

  selectPolygon(): IndexedPolygon {
    let selector = new TopN<IndexedPolygon>(3);
    // We choose the 'one' with the biggest area
    this.mesh.polygons.forEach(indexedPoly => {
      let poly: Polygon = this.indexedPolyToCoordinates(indexedPoly);
      let polyArea: number = this.getFuzzValue(this.polygonAreaFuzzFactor) * poly.area();
      selector.insert(indexedPoly, polyArea);
    });
    return selector.select();
  }

  selectEdges(poly: IndexedPolygon): [number, number] {
    // we choose the first edge by selecting on edge indices, with value the length of the edge
    let selector = new TopN<Number>(3);
    poly.forEach((oriEdge, edgeIdx) => {
      let vert0 = this.mesh.vertices[oriEdge.edge.indices[0]];
      let vert1 = this.mesh.vertices[oriEdge.edge.indices[1]];
      let deltaV = Vector2.Subtract(vert1, vert0);
      selector.insert(edgeIdx, this.getFuzzValue(this.edgeLengthFuzzFactor) * deltaV.lengthSq());
    });
    let firstIdx: number = selector.select().valueOf();
    // Get all the relevant info from the first edge
    let firstEdgeVert0 = this.mesh.vertices[poly[firstIdx].edge.indices[0]];
    let firstEdgeVert1 = this.mesh.vertices[poly[firstIdx].edge.indices[1]];
    let firstEdgeMidpoint = Vector2.Interpolate(firstEdgeVert0, firstEdgeVert1, 0.5);
    let firstEdgeVector = Vector2.Subtract(firstEdgeVert1, firstEdgeVert0).normalize();

    // Now choose the second edge by selecting similarly, but limiting ourselves
    // to edges with midpoints between 30 and 60 degrees from the midpoint of
    // the edge we're cutting (and vice versa).
    let secondSelector = new TopN<Number>(3);
    poly.forEach((oriEdge, edgeIdx) => {
      if (edgeIdx != firstIdx) {
        let secondEdgeVert0 = this.mesh.vertices[oriEdge.edge.indices[0]];
        let secondEdgeVert1 = this.mesh.vertices[oriEdge.edge.indices[1]];
        let secondEdgeRawVector = Vector2.Subtract(secondEdgeVert1, secondEdgeVert0);
        let secondEdgeVector = Vector2.Normalize(secondEdgeRawVector);
        let secondEdgeMidpoint = Vector2.Interpolate(secondEdgeVert0, secondEdgeVert1, 0.5);
        let midToMidVector = Vector2.Subtract(secondEdgeMidpoint, firstEdgeMidpoint).normalize();
        if (
          (Math.abs(Vector2.Dot(firstEdgeVector, midToMidVector)) < 0.5)
          && (Math.abs(Vector2.Dot(secondEdgeVector, midToMidVector)) < 0.5)
        )
          secondSelector.insert(edgeIdx,
            this.getFuzzValue(this.edgeLengthFuzzFactor) * secondEdgeRawVector.lengthSq());
      }
    });
    // If we have no vectors that fit the criterion, then let's just find the pair with
    // the largest value of the minimum of the two angles.
    if (secondSelector.topNArray.length == 0) {
      let minAngleSelector = new TopN<Number>(1);
      poly.forEach((oriEdge, edgeIdx) => {
        if (edgeIdx != firstIdx) {
          let secondEdgeVert0 = this.mesh.vertices[oriEdge.edge.indices[0]];
          let secondEdgeVert1 = this.mesh.vertices[oriEdge.edge.indices[1]];
          let secondEdgeRawVector = Vector2.Subtract(secondEdgeVert1, secondEdgeVert0);
          let secondEdgeVector = Vector2.Normalize(secondEdgeRawVector);
          let secondEdgeMidpoint = Vector2.Interpolate(secondEdgeVert0, secondEdgeVert1, 0.5);
          let midToMidVector = Vector2.Subtract(secondEdgeMidpoint, firstEdgeMidpoint).normalize();
          let maxDotProd = Math.max(
            Math.abs(Vector2.Dot(firstEdgeVector, midToMidVector)),
            Math.abs(Vector2.Dot(secondEdgeVector, midToMidVector))
          );
          minAngleSelector.insert(edgeIdx, -maxDotProd);
        }
      });
      return [firstIdx, minAngleSelector.select().valueOf()];
    }
    // If we do, then we just find one of those sets
    return [firstIdx, secondSelector.select().valueOf()];
  }

  indexedPolyToCoordinates(indexedPoly: IndexedPolygon): Polygon {
    let verts = indexedPoly.map((oriEdge) =>
      this.mesh.vertices[oriEdge.edge.indices[oriEdge.orientation]]
    );
    return new Polygon(verts);
  }

};