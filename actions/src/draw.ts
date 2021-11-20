// @ts-ignore
import { createSVGWindow } from 'svgdom';
import { SVG, registerWindow } from '@svgdotjs/svg.js'

import { IRecord } from './types'

export function draw(record: IRecord) {
  const window = createSVGWindow()
  const document = window.document;
  registerWindow(window, document);

  const canvas = SVG(document.documentElement)

  // @ts-ignore
  canvas.rect(100, 100).fill('yellow').move(50,50)

  // get your svg as string
  return canvas.svg();
}
