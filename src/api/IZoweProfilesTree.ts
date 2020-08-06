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
import * as nls from "vscode-nls";
import { Profiles } from "../Profiles";

nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

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
  public async openProfileFile(): Promise<vscode.TextEditor> {
    const selectedNode = this.getSelectedNode();
    const profileName = selectedNode.profileName;
    const profileType = selectedNode.profileType;
    if (!profileName) {
      return;
    }
    const profilePath = await Profiles.getInstance().getProfilePath(profileType, profileName);
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(profilePath));
    return vscode.window.showTextDocument(doc, 1, false);
  }

  public getSelectedNode(): ProfileTreeNode {
    return this.treeView.selection && this.treeView.selection[0];
  }

  public async createNewProfile(selectedNode: ProfileTreeNode): Promise<boolean> {
    const profileType = selectedNode.profileType;
    const profileSchema = await Profiles.getInstance().getSchema(profileType);
    const newProfileName = await vscode.window.showInputBox({
      placeHolder:
          localize("createProfileTreeNode.name", "Enter profile name")
    });
    if (!newProfileName) {
      return undefined;
    }
    const newProfilePath = await Profiles.getInstance().getProfilePath(profileType, newProfileName);
    const newFilePath = vscode.Uri.parse("untitled:" + newProfilePath);
    const doc = await vscode.workspace.openTextDocument(newFilePath);
    const newDocument = await vscode.window.showTextDocument(doc, 1, false);
    const profileTemplateText = this.createProfileTemplate(profileSchema);
    return newDocument.edit((edit) => {
      edit.insert(new vscode.Position(0, 0), profileTemplateText);
    });
  }

  private createProfileTemplate(profileSchema: any): string {
    // it combines the 1st 2 words
    const profileKeys = Object.keys(profileSchema);
    return profileKeys.reduce((accumulator, currentValue) => {
      const currentLine = currentValue + ":" + "\n";
      return accumulator + currentLine;
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
