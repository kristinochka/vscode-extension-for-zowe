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
import { Profiles } from "../Profiles";

export class IZoweProfilesTree implements vscode.TreeDataProvider<ProfileTreeNode> {
  private treeView: vscode.TreeView<ProfileTreeNode>;
  constructor() {
    this.treeView = vscode.window.createTreeView("zowe.profiles.explorer", {treeDataProvider: this});
  }

  public getTreeView(): vscode.TreeView<ProfileTreeNode> {
    return this.treeView;
  }
  public getTreeItem(element: ProfileTreeNode): vscode.TreeItem {
    return element;
  }
  public async getChildren(treeNode?: ProfileTreeNode): Promise<ProfileTreeNode[]> {
    if (!treeNode) {
      const profileTypes = Profiles.getInstance().getAllTypes();
      const typeObjects = profileTypes.map((type) => {
        const profileTypeNode = new ProfileTreeNode( // change var names for clarity!
          type,
          type,
          undefined,
          vscode.TreeItemCollapsibleState.Collapsed,
          "profileTypeNode"
        );
        return profileTypeNode;
      });
      return Promise.resolve(typeObjects);
    }
    if (treeNode) {
      const listOfProfiles = await Profiles.getInstance().getNamesForType(treeNode.label);
      const defaultProfileName = await Profiles.getInstance().getDefaultProfile(treeNode.profileType);
      const listOfProfileTypeObj = listOfProfiles.map((profileName) => {
        let nodeLabel = profileName;
        if (profileName === (defaultProfileName && defaultProfileName.name)) { // why doesn't ProfileName.!name
          nodeLabel = `${nodeLabel} (default)`;
        }
        const profileNode = new ProfileTreeNode(nodeLabel, treeNode.profileType, profileName, vscode.TreeItemCollapsibleState.None);
        const command = {command: "zowe.profiles.openProfile", title: "Open", argumants: [profileNode]};
        profileNode.command = command;
        return profileNode;
      });
      return listOfProfileTypeObj;
    }
  }
  public async openProfileFile() {
    const profileName = this.getSelectedNode().profileName;
    const profileType = this.getSelectedNode().profileType;
    if (!profileName) {
      return;
    }
    const profilePath = await Profiles.getInstance().getProfilePath(profileType, profileName);
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(profilePath));
    vscode.window.showTextDocument(doc, 1, false);
  }

  public getSelectedNode(): ProfileTreeNode {
    return this.treeView.selection[0];
  }

  public async createNewProfile() { // repetative code, define return type
    const profileType = this.getSelectedNode().profileType;
    if (!profileType) {
      return;
    }
    const profileVar = Profiles.getInstance();
    const sshSchema = await profileVar.getSchema("ssh");
    const zosmfSchema = await profileVar.getSchema("zosmf");
    const rseSchema = await profileVar.getSchema("rse");
    // tslint:disable-next-line: no-console
    console.log(profileVar, sshSchema, zosmfSchema, rseSchema);
    const newProfilePath = await Profiles.getInstance().getProfilePath(profileType, "untitled");
    const newFilePath = vscode.Uri.parse("untitled:" + newProfilePath);
    const doc = await vscode.workspace.openTextDocument(newFilePath);
    const newDocument = await vscode.window.showTextDocument(doc, 1, false);
    // make user save-as when they close profile type?
    newDocument.edit((edit) => {
      edit.insert(new vscode.Position(0, 0), "Your advertisement here");
    });
  }
}

// tslint:disable-next-line: max-classes-per-file
export class ProfileTreeNode extends vscode.TreeItem { // re-name to something else
  constructor(
    public readonly label: string,
    public readonly profileType: string,
    public readonly profileName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue?: string, // make this necessary?
    public command?: vscode.Command

  ) {
    super(label, collapsibleState);
  }
}
