import { Vector2 } from "./vector";
import { Polygon } from "./polygon";

// This class represents a set of connected polygons, along with the
// connectivity information. For greatest flexibility, we take our polygons
// as lists of edges along with their orientations; each edge contains two
// vertex indices representing the two ends of the edge, along with the
// polygons on either side of it. (Note that there are border edges, which
// will only have one adjacent polygon).

type Edge = {
  indices: [number, number];
  adjacentPolys: [IndexedPolygon | undefined, IndexedPolygon | undefined];
}

type OrientedEdge = {
  edge: Edge;
  orientation: number;
};
type IndexedPolygon = Array<OrientedEdge>;

export class PolygonMesh {
  vertices: Array<Vector2>;
  edges: Array<Edge>;
  polygons: Array<IndexedPolygon>;

  // The constructor builds a single rectangular polygon from the coordinates given
  constructor(min: Vector2, max: Vector2) {
    let minX = min.data[0];
    let minY = min.data[1];
    let maxX = max.data[0];
    let maxY = max.data[1];

    // Define the four vertices of the rectangle
    this.vertices = [
      new Vector2(minX, minY),
      new Vector2(maxX, minY),
      new Vector2(maxX, maxY),
      new Vector2(minX, maxY)  
    ];

    // Define the four edges; we leave the adjacent polygons undefined for now
    this.edges = [0, 1, 2, 3].map(idx => {
      return {
        indices: [idx, (idx+1)%4],
        adjacentPolys: [undefined, undefined]
      }
    });

    // Define the array of polygons - it's just a single polygon, consisting of
    // all four edges (in orientation 0).
    this.polygons = [
      this.edges.map(e => {
        return {
          edge: e,
          orientation: 0
        }
      })
    ];

    // And then make sure that the edges each know that they have this polygon alongside of them.
    this.edges.forEach(e => {
      e.adjacentPolys[0] = this.polygons[0];
    });
  }

  // splitPolygon takes the requested polygon and a pair of indices of the edges
  // to split it along. It then takes the midpoint (for now) of each of those edges
  // and creates two new edges each, one to either side of the midpoint, along with
  // another edge between the two midpoints. After that it creates two new polygons,
  // each using the new midpoint-to-midpoint edge and 'half' of the edges from the
  // original polygon.
  splitPolygon(poly: IndexedPolygon, firstEdgeIdx: number, secondEdgeIdx: number): void {
    // First grab the edges themselves
    let edgeIndices = [Math.min(firstEdgeIdx, secondEdgeIdx), Math.max(firstEdgeIdx, secondEdgeIdx)];
    let oldOrientedEdges = edgeIndices.map((idx) => poly[idx]);
    // Then their midpoints
    let midpoints = oldOrientedEdges.map((edge) =>
      Vector2.Interpolate(
        this.vertices[edge.edge.indices[0]],
        this.vertices[edge.edge.indices[1]],
        0.5
      )
    );
    let midpointIndices = [this.vertices.length, this.vertices.length+1];
    this.vertices.push(midpoints[0]);
    this.vertices.push(midpoints[1]);

    // Now we create new edges; conceptually two for each of the original two edges,
    // though for convenience that's handled by mutating the values of one of the two
    // and creating another.
    let newEdges = edgeIndices.map((edgeIdx) => {
      return {
        indices: [...poly[edgeIdx].edge.indices],
        adjacentPolys: [...poly[edgeIdx].edge.adjacentPolys]
      } as Edge;
    });
    let newOrientedEdges = edgeIndices.map((edgeIdx, idx) => {
      return {
        edge: newEdges[idx],
        orientation: poly[edgeIdx].orientation
      } as OrientedEdge;
    });

    // We also have to create the other-direction versions of the new edges,
    // to splice into the polygons on the other side of the (old) edge.
    let newReverseOrientedEdges = edgeIndices.map((edgeIdx, idx) => {
      return {
        edge: newEdges[idx],
        orientation: 1-poly[edgeIdx].orientation
      } as OrientedEdge;
    });

    // Then figure out the indices of these edges on their other polygons and insert them.
    edgeIndices.forEach((edgeIdx, idx) => {
      let orientedEdge = poly[edgeIdx];
      let otherPolygon = orientedEdge.edge.adjacentPolys[1-orientedEdge.orientation];
      if (otherPolygon) {
        let otherIdx = otherPolygon.findIndex((e) => e.edge === orientedEdge.edge);
        if (otherIdx >= 0) {
          otherPolygon.splice(otherIdx, 0, newReverseOrientedEdges[idx]);
        }
      }
    });

    // We also create an edge for the line between the two midpoints
    let newMiddleEdge: Edge = {
      indices: midpointIndices as [number, number],
      adjacentPolys: [undefined, undefined]
    };

    // we create two new oriented edges, one for that line in each direction
    let newMiddleOrientedEdges = [0, 1].map(orientation => {
      return {
        edge: newMiddleEdge,
        orientation: orientation
      } as OrientedEdge;
    });

    // Since in 'this' polygon the edge will run from edge[orientedEdge] to edge[1-orientedEdge],
    // In the 'old' half of edge0 we replace edge[1-orientedEdge] with the index of midpoint0,
    // and in the new half we replace edge[orientedEdge] with it, and likewise for edge1.
    [0, 1].forEach((idx) => {
      let oldEdge = oldOrientedEdges[idx];
      oldEdge.edge.indices[1-oldEdge.orientation] = midpointIndices[idx];
      newOrientedEdges[idx].edge.indices[oldEdge.orientation] = midpointIndices[idx];
    });

    // now we create a new polygon for one half of the split; similarly to before, we'll reuse
    // the existing polygon for the other half.
    let newPoly: IndexedPolygon = [
      newOrientedEdges[0],
      ...poly.slice(edgeIndices[0]+1, edgeIndices[1]+1),
      newMiddleOrientedEdges[1]
    ];

    // For the existing polygon, we basically splice out all the edges that go to the new polygon,
    // and replace them with the middle edge and the second half of the second edge.
    poly.splice(edgeIndices[0]+1, edgeIndices[1]-edgeIndices[0],
                newMiddleOrientedEdges[0], newOrientedEdges[1]);

    // we set the adjacent polys on the new middle edge to be our two polygons
    newMiddleEdge.adjacentPolys = [poly, newPoly];

    // and then finally we change all the edges on the new polygon to point to it
    newPoly.forEach(orientedEdge => {
      orientedEdge.edge.adjacentPolys[orientedEdge.orientation] = newPoly;
    });

    // Finally finally, add all the new edges and the new polygon to the arrays
    this.polygons.push(newPoly);
    this.edges.concat([...newEdges]);
    this.edges.push(newMiddleEdge);
  }
}
