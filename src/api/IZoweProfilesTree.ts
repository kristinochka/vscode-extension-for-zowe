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

// tslint:disable: no-console
// TO-DO: Localization!
export class IZoweProfilesTree implements vscode.TreeDataProvider<ProfileTreeNode> {
  public mOnDidChangeTreeData: vscode.EventEmitter<ProfileTreeNode | undefined> = new vscode.EventEmitter<ProfileTreeNode | undefined>();
  public readonly onDidChangeTreeData: vscode.Event<ProfileTreeNode | undefined> = this.mOnDidChangeTreeData.event;
  private treeView: vscode.TreeView<ProfileTreeNode>;

  constructor() {
    this.treeView = vscode.window.createTreeView("zowe.profiles.explorer", {treeDataProvider: this});
  }

  public getTreeView(): vscode.TreeView<ProfileTreeNode> {
    return this.treeView;
  }

  public getTreeItem(treeNode: ProfileTreeNode): vscode.TreeItem {
    return treeNode;
  }

  public async getChildren(treeNode?: ProfileTreeNode): Promise<ProfileTreeNode[]> {
    if (!treeNode) {
      const profileTypes = Profiles.getInstance().getAllTypes();
      return profileTypes.map((profileType) => {
        return new ProfileTreeNode(
          profileType,
          profileType,
          undefined,
          vscode.TreeItemCollapsibleState.Collapsed,
          "profileTypeNode"
        );
      });
    }
    if (treeNode) {
      const { profileType } = treeNode;
      const listOfProfiles = await Profiles.getInstance().getNamesForType(profileType);
      const defaultProfileName = await Profiles.getInstance().getDefaultProfile(profileType);
      const listOfProfileTypeObj = listOfProfiles.map((profileName) => {
        let nodeLabel = profileName;
        if (profileName === (defaultProfileName && defaultProfileName.name)) { // why doesn't ProfileName.!name
          nodeLabel = `${nodeLabel} (default)`;
        }
        const profileTreeNode = new ProfileTreeNode(nodeLabel, profileType, profileName, vscode.TreeItemCollapsibleState.None);
        const command = {command: "zowe.profiles.openProfile", title: "Open", argumants: [profileTreeNode]};
        profileTreeNode.command = command;
        return profileTreeNode;
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
    // TODO: should we validate input?
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
    newDocument.edit((edit) => {
      edit.insert(new vscode.Position(0, 0), profileTemplateText);
    });
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      if (document.uri.fsPath === newProfilePath) {
        console.log("refreshing stuff!");
        this.refreshElement(selectedNode);
      }
  });
    // TODO: after saving, if no default profiles exist, set new one to be default
  }

  public refreshElement(treeNode: ProfileTreeNode): void {
    treeNode.dirty = true;
    this.mOnDidChangeTreeData.fire(treeNode);
}

  private createProfileTemplate(profileSchema: any): string {
    const separator = ":\n";
    const profileKeys = Object.keys(profileSchema);
    const stringProfileKeys = profileKeys.join(separator);
    return stringProfileKeys.concat(separator);
  }
}

// tslint:disable-next-line: max-classes-per-file
export class ProfileTreeNode extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly profileType: string,
    public readonly profileName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue?: string, // make this necessary?
    public command?: vscode.Command,
    public dirty?: boolean

  ) {
    super(label, collapsibleState);
  }
}
