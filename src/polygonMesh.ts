import { Vector2 } from "./vector";

const svgSpace: string = 'http://www.w3.org/2000/svg';

// This class represents a set of connected polygons, along with the
// connectivity information. For greatest flexibility, we take our polygons
// as lists of edges along with their orientations; each edge contains two
// vertex indices representing the two ends of the edge, along with the
// polygons on either side of it. (Note that there are border edges, which
// will only have one adjacent polygon).

export type Edge = {
  indices: [number, number];
  adjacentPolys: [IndexedPolygon | undefined, IndexedPolygon | undefined];
}

export type OrientedEdge = {
  edge: Edge;
  orientation: number;
};
export type IndexedPolygon = Array<OrientedEdge>;

  // Helper function that finds the proportion of the way from v0 to v1 that the line
  // from v2-v3 intersects the line from v0-v1 at.
  function findIntersectionT(
    v0: Vector2, v1: Vector2, v2: Vector2, v3: Vector2
  ): number {
    let delta10: Vector2 = Vector2.Subtract(v1, v0);
    let delta32: Vector2 = Vector2.Subtract(v3, v2);
    let delta20: Vector2 = Vector2.Subtract(v2, v0);
    // We want to solve the simultaneous equations v0+t*delta10 = v2+s*delta32
    // This boils down to
    // t*delta10.x + s*delta32.x = delta20.x and
    // t*delta10.y + s*delta32.y = delta20.y ;
    // in other words, ((delta10.x, delta32.x), (delta10.y, delta32.y)) . (t s)^T
    // = (delta20.x, delta20.y)^T
    // So we invert the matrix, getting
    // ((delta32.y, -delta32.x), (-delta10.y, delta10.x))/(d10.x*d32.y-d10.y*d32.x)
    // as the inverse, and multiply that by (d20x, d20y) to get our values.
    // Since we only want the x, we get
    // t = (d32.y*d20.x-d32.x-d20.y) / (d10.x*d32.y-d10.y*d32.x) .
    // This is Cross(d20, d32) / Cross(d10, d32).
    return Vector2.Cross(delta20, delta32) / Vector2.Cross(delta10, delta32);
  };


export class PolygonMesh {
  vertices: Array<Vector2>;
  edges: Array<Edge>;
  polygons: Array<IndexedPolygon>;
  viewMin: Vector2;
  viewMax: Vector2;

  // The constructor builds a single rectangular polygon from the coordinates given
  constructor(min: Vector2, max: Vector2) {
    let minX = min.data[0];
    let minY = min.data[1];
    let maxX = max.data[0];
    let maxY = max.data[1];

    this.viewMin = min.clone();
    this.viewMax = max.clone();

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
  // to split it along. It then takes a point along each of those edges (interpolated
  // by t between the two vertices, where t is an input parameter)
  // and creates two new edges each, one to either side of the midpoint, along with
  // another edge between the two midpoints. After that it creates two new polygons,
  // each using the new midpoint-to-midpoint edge and 'half' of the edges from the
  // original polygon.
  splitPolygon(
    poly: IndexedPolygon,
    firstEdgeIdx: number, secondEdgeIdx: number,
    firstEdgeT: number = 0.5, secondEdgeT: number = 0.5,
    displaceVerts: boolean = false): void {
    // First grab the edges themselves
    let edgeIndices: Array<number> = [];
    let edgeTValues: Array<number> = [];
    if (firstEdgeIdx < secondEdgeIdx) {
      edgeIndices = [firstEdgeIdx, secondEdgeIdx];
      edgeTValues = [firstEdgeT, secondEdgeT];
    } else {
      edgeIndices = [secondEdgeIdx, firstEdgeIdx];
      edgeTValues = [secondEdgeT, firstEdgeT];
    }
    let oldOrientedEdges = edgeIndices.map((idx) => poly[idx]);
    // Then their midpoints
    let midpoints = oldOrientedEdges.map((edge, idx) =>
      Vector2.Interpolate(
        this.vertices[edge.edge.indices[0]],
        this.vertices[edge.edge.indices[1]],
        edgeTValues[idx]
      )
    );
    let midpointIndices = [this.vertices.length, this.vertices.length+1];
    this.vertices.push(midpoints[0].clone());
    this.vertices.push(midpoints[1].clone());
    if (displaceVerts) {
      // If we're displacing verts, let's figure out how far we can displace them
      let tValues = oldOrientedEdges.map((oriEdge, edgeIdx) => {
        let otherPoly = oriEdge.edge.adjacentPolys[1-oriEdge.orientation];
        if (otherPoly) {
          let otherPolyEdgeIdx = otherPoly.findIndex((otherOriEdge) =>
            otherOriEdge.edge == oriEdge.edge
          );
          let otherPolyAdjacentEdges = [
            otherPoly[(otherPolyEdgeIdx+1)%otherPoly.length],
            otherPoly[(otherPolyEdgeIdx+otherPoly.length-1)%otherPoly.length],
          ];
          let minT = otherPolyAdjacentEdges.map((oriEdge) => {
            let t = findIntersectionT(
              midpoints[edgeIdx], midpoints[1-edgeIdx],
              this.vertices[oriEdge.edge.indices[0]], this.vertices[oriEdge.edge.indices[1]]) / 2;
            // if we get a negative t then we can never intersect, so we'll return 1
            // (since this is getting min'd with 1/4 anyway).
            return (t < 0)? 1: t;
          }).reduce((prev, cur) => Math.min(prev, cur), 1/4);
          return minT;
        } else {
          return Number.MAX_VALUE;
        }
      })
      tValues.forEach((t, idx) => {
        if (t != Number.MAX_VALUE) {
          this.vertices[this.vertices.length-2+idx] = Vector2.Interpolate(midpoints[idx], midpoints[1-idx], t);
        }
      })
    }

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

  // Returns an SVG node with paths and polygon elements for each polygon in the mesh.
  public generateSVG(): SVGElement {
// A little one-off function for creating an 'x y' string from a Vector2
    let Vec2ToStr: (v: Vector2, s:string) => string =
    (v, s) => `${v.data[0]}${s}${v.data[1]}`;

    let rootSVGElement: SVGElement = document.createElementNS(svgSpace, 'svg') as SVGElement;
    let diagonalVec: Vector2 = Vector2.Subtract(this.viewMax, this.viewMin);
    rootSVGElement.setAttribute("width", diagonalVec.data[0].toString());
    rootSVGElement.setAttribute("height", diagonalVec.data[1].toString());
    rootSVGElement.setAttribute("viewBox",
      `${Vec2ToStr(this.viewMin, ' ')} ${Vec2ToStr(diagonalVec, ' ')}`
    );
    this.polygons.forEach(poly => {
      let verts: Array<Vector2> = poly.map((oriEdge) =>
        this.vertices[oriEdge.edge.indices[oriEdge.orientation]]
      );
      let groupElement: SVGGElement = document.createElementNS(svgSpace, 'g') as SVGGElement;
      let pathElement: SVGPathElement = document.createElementNS(svgSpace, 'path') as SVGPathElement;
      let polygonElement: SVGPolygonElement = document.createElementNS(svgSpace, 'polygon') as SVGPolygonElement;
      let pathString = `M ${Vec2ToStr(verts[0], ' ')}`;
      let polygonString = '';
      verts.forEach((vert, vertIdx) => {
        polygonString += ` ${Vec2ToStr(vert, ',')}`;
        pathString += ` L ${Vec2ToStr(verts[(vertIdx+1)%verts.length], ' ')}`;
      });
      polygonElement.setAttribute('points', polygonString);
      polygonElement.setAttribute('stroke', 'black');
      polygonElement.setAttribute('fill', 'white');
      pathElement.setAttribute('d', pathString);
      groupElement.appendChild(pathElement);
      groupElement.appendChild(polygonElement);
      rootSVGElement.appendChild(groupElement);
    });
    return rootSVGElement;
  }
}
