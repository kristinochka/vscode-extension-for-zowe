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

import { USSTree } from "../USSTree";
import { ZoweUSSNode } from "../ZoweUSSNode";
import * as vscode from "vscode";
import * as zowe from "@brightside/core";
import * as fs from "fs";

/**
 * Prompts the user for a path, and populates the [TreeView]{@link vscode.TreeView} based on the path
 *
 * @param {ZoweUSSNode} node - The session node
 * @param {ussTree} ussFileProvider - Current ussTree used to populate the TreeView
 * @returns {Promise<void>}
 */
export async function createUSSNode(node: ZoweUSSNode, ussFileProvider: USSTree, nodeType: string) {
    const name = await vscode.window.showInputBox({placeHolder: "Name of file or directory"});
    if (name) {
        try {
            const filePath = `${node.fullPath}/${name}`;
            await zowe.Create.uss(node.getSession(), filePath, nodeType);
            ussFileProvider.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Unable to create node: ${err.message}`);
            throw (err);
        }
    }
}

export async function deleteUSSNode(node: ZoweUSSNode, ussFileProvider: USSTree, filePath: string) {
    // handle zosmf api issue with file paths
    const nodePath = node.fullPath.startsWith("/") ?  node.fullPath.substring(1) :  node.fullPath;
    const quickPickOptions: vscode.QuickPickOptions = {
        placeHolder: `Are you sure you want to delete ${node.label}`,
        ignoreFocusOut: true,
        canPickMany: false
    };
    if (await vscode.window.showQuickPick(["Yes", "No"], quickPickOptions) === "No") {
        return;
    }
    try {
        const isRecursive = node.contextValue === "directory" ? true : false;
        await zowe.Delete.ussFile(node.getSession(), nodePath, isRecursive);
        ussFileProvider.refresh();
        deleteFromDisk(node, filePath);
    } catch (err) {
        vscode.window.showErrorMessage(`Unable to delete node: ${err.message}`);
        throw (err);
    }
}

/**
 * Refreshes treeView MOVE FUNCTION FROM EXTENSION!
 *
 * @param {USSTree} ussFileProvider
 */
export async function refreshAllUSS(ussFileProvider: USSTree) {
    ussFileProvider.mSessionNodes.forEach((node) => {
        node.dirty = true;
    });
    ussFileProvider.refresh();
}

export async function renameUSSNode(node: ZoweUSSNode, ussFileProvider: USSTree, filePath: string) {
    const newName = await vscode.window.showInputBox({value: node.label});
    if (!newName) {
        return;
    }
    try {
        const newNamePath = node.mParent.fullPath + "/" +  newName;
        await zowe.Utilities.renameUSSFile(node.getSession(), node.fullPath, newNamePath);
        if (node.contextValue === "directory") {
            refreshAllUSS(ussFileProvider);
        } else {
            ussFileProvider.refresh();
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Unable to rename node: ${err.message}`);
        throw (err);
    }
}

/**
 * Marks file as deleted from disk
 *
 * @param {ZoweUSSNode} node
 */
export async function deleteFromDisk(node: ZoweUSSNode, filePath: string) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        catch (err) {}
}