"use strict";
exports.__esModule = true;
/**
 * Returns the ancestry of the [[Node]] from the root [[Node]] to the [[Node]] provided.
 * @param TParent The type of the [[Node]]'s parent [[Node]].
 * @param node The [[Node]] to return the ancestry for.
 */
function Ancestors(node) {
    var result = node.parent ? Ancestors(node.parent) : new Array();
    result.push(node);
    return result;
}
exports.Ancestors = Ancestors;
function LCA(ancestry1, ancestry2) {
    var result = 0;
    while (ancestry1[result] === ancestry2[result]) {
        result++;
    }
    return result - 1;
}
exports.LCA = LCA;