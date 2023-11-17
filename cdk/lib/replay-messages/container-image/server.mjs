/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { handler } from './startReplay.mjs'

function parseRegularInput (argumentArray) {
  let recordingId
  let replayId
  let topicPrefix

  recordingId = argumentArray[0]
  if (recordingId === undefined) {
    throw new Error('recordingId is undefined')
  }

  replayId = argumentArray[1]
  if (replayId === undefined) {
    throw new Error('replayId is undefined')
  }
  replayId = parseInt(replayId)

  if (typeof replayId !== 'number') {
    throw new Error('replayId is invalid')
  }

  topicPrefix = argumentArray.slice(2).join(' ')

  return {
    recordingId, replayId, topicPrefix
  }
}

function parseB64Input (argumentArray) {
  const b64input = argumentArray[0]
  if (!b64input) throw new Error('base64-encoded input missing')
  const input = Buffer.from(b64input, 'base64').toString('utf-8')
  const argsArray = input.split(' ')

  return parseRegularInput(argsArray)
}

function parseArguments (argumentArray) {
// Checks for --input
  let isb64 = false
  let inputVarsIndex = argumentArray.indexOf('--input')
  if (inputVarsIndex === -1) {
    // check for --input-b64 instead
    inputVarsIndex = argumentArray.indexOf('--input-b64')
    if (inputVarsIndex === -1) {
      throw new Error('no --input or --input-b64 found')
    } else {
      isb64 = true
    }
  }

  if (!isb64) {
    return parseRegularInput(argumentArray.slice(inputVarsIndex + 1))
  } else {
    return parseB64Input(argumentArray.slice(inputVarsIndex + 1))
  }
}

const input = parseArguments(process.argv)

handler(input)
