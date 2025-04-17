declare module '*.svg' {
  import { ComponentType, JSX } from 'preact';
  const SVGComponent: ComponentType<JSX.SVGAttributes<SVGElement>>;
  export default SVGComponent;
} 