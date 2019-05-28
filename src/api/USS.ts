import * as zowe from "@brightside/core";
import { Session } from "@brightside/imperative";
import * as zowePlugin from "@brightside/zowe-cli-sample-plugin";

const profileTypes = {
    ZOWE_REST: "zowe-rest",
    ZOSMF: "zosmf"
};
export async function listFiles(session: Session, fullPath: string) {
    const profileType = session.ISession.profileType;
    if (profileType === profileTypes.ZOWE_REST) {
        return await zowePlugin.UssFiles.listFiles(session, fullPath);
    }
    return await zowe.List.fileList(session, fullPath);
}