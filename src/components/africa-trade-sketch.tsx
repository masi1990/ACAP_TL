/** Coastline sketch from published capes and gulfs, drawn as a trade map. */
const COAST: Array<[number, number]> = [
  [-5.4, 36.0],
  [-1.8, 35.3],
  [1.8, 36.7],
  [4.8, 36.7],
  [8.2, 36.9],
  [10.4, 37.1],
  [11.0, 33.6],
  [13.4, 32.6],
  [16.2, 31.6],
  [19.6, 30.2],
  [22.4, 32.4],
  [25.4, 31.4],
  [30.2, 31.3],
  [32.4, 31.1],
  [33.8, 28.4],
  [35.2, 24.6],
  [36.8, 21.4],
  [38.6, 18.0],
  [39.4, 15.4],
  [41.2, 13.8],
  [43.2, 12.2],
  [46.8, 11.4],
  [49.6, 11.6],
  [51.3, 11.8],
  [50.6, 9.2],
  [48.2, 6.8],
  [45.2, 3.6],
  [42.4, 0.4],
  [41.4, -2.4],
  [39.8, -5.4],
  [39.4, -8.2],
  [40.2, -11.6],
  [40.6, -15.4],
  [37.2, -18.2],
  [35.4, -21.6],
  [33.2, -25.6],
  [32.4, -28.8],
  [29.6, -31.6],
  [26.4, -33.6],
  [22.2, -34.4],
  [19.2, -34.6],
  [18.3, -33.6],
  [17.2, -30.4],
  [15.2, -26.4],
  [13.8, -22.2],
  [12.4, -17.2],
  [13.2, -12.2],
  [12.6, -8.2],
  [11.6, -5.2],
  [9.4, -1.2],
  [9.8, 2.4],
  [8.4, 4.2],
  [5.6, 5.2],
  [3.6, 6.3],
  [1.4, 6.2],
  [-1.2, 5.2],
  [-4.2, 5.1],
  [-7.4, 4.8],
  [-8.6, 6.6],
  [-11.4, 6.9],
  [-13.6, 8.4],
  [-15.4, 10.2],
  [-16.6, 12.4],
  [-17.4, 14.6],
  [-16.4, 17.6],
  [-16.2, 21.2],
  [-15.6, 24.4],
  [-13.2, 27.4],
  [-10.2, 29.8],
  [-9.6, 32.4],
  [-6.4, 35.4],
  [-5.4, 36.0],
];

const MADAGASCAR: Array<[number, number]> = [
  [49.2, -12.0],
  [50.4, -15.2],
  [49.6, -19.4],
  [47.2, -25.0],
  [43.8, -25.2],
  [43.4, -21.4],
  [44.2, -16.8],
  [47.6, -13.2],
  [49.2, -12.0],
];

function xy(lon: number, lat: number): [number, number] {
  const x = Math.round((((lon + 20) / 74) * 560 + 36) * 10) / 10;
  const y = Math.round((((38 - lat) / 76) * 640 + 18) * 10) / 10;
  return [x, y];
}

function outline(points: Array<[number, number]>) {
  return (
    points
      .map((point, index) => {
        const [x, y] = xy(point[0], point[1]);
        return `${index === 0 ? "M" : "L"}${x} ${y}`;
      })
      .join(" ") + " Z"
  );
}

function route(points: Array<[number, number]>) {
  return points
    .map((point, index) => {
      const [x, y] = xy(point[0], point[1]);
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

export function AfricaTradeSketch() {
  const atlantic = route([
    [-14, 20],
    [-18, 8],
    [-12, -6],
    [-8, -22],
    [8, -36],
    [22, -38],
  ]);
  const indian = route([
    [44, -4],
    [52, -8],
    [54, -20],
    [42, -32],
    [28, -38],
  ]);
  const inland = route([
    [-4, 6],
    [8, 4],
    [18, 2],
    [30, -2],
    [38, -4],
  ]);
  const north = route([
    [-8, 33],
    [4, 30],
    [16, 28],
    [28, 30],
  ]);

  return (
    <figure className="rise-delay-2 mx-auto w-full max-w-md" aria-label="Sketch of Africa and the movement of goods">
      <svg viewBox="0 0 640 700" className="h-auto w-full" role="img">
        <title>Africa, with ships, road freight, and air cargo</title>
        <defs>
          <marker id="trade-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0 0 L7 3 L0 6 Z" fill="#e7c98a" />
          </marker>
        </defs>
        <path d={outline(COAST)} fill="rgba(244,255,249,0.14)" stroke="#f4fff9" strokeWidth="1.6" strokeLinejoin="round" />
        <path d={outline(MADAGASCAR)} fill="rgba(244,255,249,0.14)" stroke="#f4fff9" strokeWidth="1.4" strokeLinejoin="round" />
        <path d={atlantic} fill="none" stroke="#e7c98a" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#trade-arrow)" />
        <path d={indian} fill="none" stroke="#e7c98a" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#trade-arrow)" />
        <path d={inland} fill="none" stroke="#f4fff9" strokeWidth="1.3" strokeDasharray="2 4" markerEnd="url(#trade-arrow)" opacity="0.85" />
        <path d={north} fill="none" stroke="#f4fff9" strokeWidth="1.3" strokeDasharray="2 4" markerEnd="url(#trade-arrow)" opacity="0.85" />
        <Ship x={xy(-20, 6)[0]} y={xy(-20, 6)[1]} />
        <Ship x={xy(56, -16)[0]} y={xy(56, -16)[1]} />
        <Truck x={xy(22, 1)[0]} y={xy(22, 1)[1]} />
        <Plane x={xy(8, 22)[0]} y={xy(8, 22)[1]} />
        <Crate x={xy(12, -28)[0]} y={xy(12, -28)[1]} />
      </svg>
    </figure>
  );
}

function Ship({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke="#f4fff9" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M-16 4 L16 4 L12 12 L-12 12 Z" fill="rgba(231,201,138,0.35)" />
      <path d="M-6 4 L-6 -6 L6 -6 L6 4" />
      <path d="M-4 -6 L-2 -12 L2 -12 L4 -6" />
      <path d="M-18 14 Q0 18 18 14" />
    </g>
  );
}

function Truck({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke="#f4fff9" strokeWidth="1.4">
      <rect x="-18" y="-6" width="22" height="12" rx="1" fill="rgba(231,201,138,0.28)" />
      <path d="M4 -6 L12 -6 L16 0 L16 6 L4 6 Z" fill="rgba(244,255,249,0.2)" />
      <circle cx="-10" cy="8" r="2.2" fill="#f4fff9" />
      <circle cx="10" cy="8" r="2.2" fill="#f4fff9" />
    </g>
  );
}

function Plane({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-18)`} fill="#e7c98a" stroke="#f4fff9" strokeWidth="0.6">
      <path d="M-16 0 L14 0 L18 2 L14 3 L4 2 L-2 8 L-6 8 L-2 2 L-12 3 Z" />
    </g>
  );
}

function Crate({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="rgba(231,201,138,0.3)" stroke="#f4fff9" strokeWidth="1.3">
      <rect x="-8" y="-8" width="16" height="16" />
      <path d="M-8 -8 L8 8 M8 -8 L-8 8" />
    </g>
  );
}
