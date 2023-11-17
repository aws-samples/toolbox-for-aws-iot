/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatTimestampISO(epochMs, excludeDate = false, utc= false) {
  if(!epochMs) return 'N/A'
  const ts = new Date(epochMs);
  let hours, minutes, seconds, fullyear, month, date;

  if (utc) {
    hours = ts.getUTCHours();
    minutes = ts.getUTCMinutes();
    seconds = ts.getUTCSeconds();
    fullyear = ts.getUTCFullYear();
    month = ts.getUTCMonth();
    date = ts.getUTCDate();

  } else {
    hours = ts.getHours();
    minutes = ts.getMinutes();
    seconds = ts.getSeconds();
    fullyear = ts.getFullYear();
    month = ts.getMonth();
    date = ts.getDate();

  }

  const timeString = hours.toString().padStart(2, "0") + ":" +
    minutes.toString().padStart(2, "0") + ":" +
    seconds.toString().padStart(2, "0") + ""

  return excludeDate ? timeString : fullyear + "-" +
    (month + 1).toString().padStart(2, '0') + "-" +
    (date).toString().padStart(2, "0") + " " + timeString
}