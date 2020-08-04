/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import * as vscode from "vscode";

export class IZoweSingleProfile extends vscode.TreeItem {
  public type: string;
  constructor(
      type: string,
      label: string,
      collapsibleState: vscode.TreeItemCollapsibleState,
      command?: vscode.Command
  ) {
      super(label, collapsibleState);
      this.type = type;
      this.command = command;
  }
}
