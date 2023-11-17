/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {Navigate, useLocation} from 'react-router-dom';
import {useAuthenticator} from '@aws-amplify/ui-react';

export function RequireAuth({children}) {
  const location = useLocation();
  const {route} = useAuthenticator((context) => [context.route]);
  if (route !== 'authenticated') {
    return <Navigate to="/login" state={{from: location}} replace/>;
  }
  return children;
}