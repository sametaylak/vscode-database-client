import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "../common/appInsightsClient";
import { Global } from "../common/global";
import { Utility } from "../common/utility";
import { InfoNode } from "./infoNode";
import { INode } from "./INode";
import { TableNode } from "./tableNode";
import { DatabaseCache } from "../common/DatabaseCache";
import { ModelType } from "../common/constants";

export class DatabaseNode implements INode {
    identify: string;
    type: string = ModelType.DATABASE;
    constructor(readonly host: string, readonly user: string,
        private readonly password: string, readonly port: string, readonly database: string,
        private readonly certPath: string) {
    }

    public getTreeItem(): vscode.TreeItem {
        this.identify = `${this.host}_${this.port}_${this.user}_${this.database}`
        return {
            label: this.database,
            collapsibleState: DatabaseCache.getElementState(this),
            contextValue: "database",
            iconPath: path.join(__filename, "..", "..", "..", "resources", "database.svg"),
        };
    }

    public async getChildren(isRresh: boolean = false): Promise<INode[]> {
        const connection = Utility.createConnection({
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath,
        });

        return Utility.queryPromise<any[]>(connection, `SELECT TABLE_NAME FROM information_schema.TABLES  WHERE TABLE_SCHEMA = '${this.database}' LIMIT ${Utility.maxTableCount}`)
            .then((tables) => {
                let tableNodes = DatabaseCache.getTableListOfDatabase(this.database)
                if (tableNodes && tableNodes.length > 1 && !isRresh) {
                    return tableNodes
                }

                tableNodes = tables.map<TableNode>((table) => {
                    let tableNode = new TableNode(this.host, this.user, this.password, this.port, this.database, table.TABLE_NAME, this.certPath)
                    return tableNode;
                })
                DatabaseCache.setTableListOfDatabase(this.database, tableNodes)
                return tableNodes;
            })
            .catch((err) => {
                return [new InfoNode(err)];
            });
    }

    public async newQuery() {
        AppInsightsClient.sendEvent("newQuery", { viewItem: "database" });
        Utility.createSQLTextDocument();

        Global.activeConnection = {
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath,
        };
    }
}
