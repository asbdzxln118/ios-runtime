/*
 * Copyright (C) 2016 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

WebInspector.HeapSnapshotClusterContentView = class HeapSnapshotClusterContentView extends WebInspector.ClusterContentView
{
    constructor(heapSnapshot)
    {
        super(heapSnapshot);

        console.assert(heapSnapshot instanceof WebInspector.HeapSnapshotProxy || heapSnapshot instanceof WebInspector.HeapSnapshotDiffProxy);

        this._heapSnapshot = heapSnapshot;

        function createPathComponent(displayName, className, identifier)
        {
            let pathComponent = new WebInspector.HierarchicalPathComponent(displayName, className, identifier, false, true);
            pathComponent.addEventListener(WebInspector.HierarchicalPathComponent.Event.SiblingWasSelected, this._pathComponentSelected, this);
            return pathComponent;
        }

        this._shownInitialContent = false;
        this._instancesContentView = null;
        this._objectGraphContentView = null;

        this._instancesPathComponent = createPathComponent.call(this, WebInspector.UIString("Instances"), "heap-snapshot-instances-icon", WebInspector.HeapSnapshotClusterContentView.InstancesIdentifier);
        this._objectGraphPathComponent = createPathComponent.call(this, WebInspector.UIString("Object Graph"), "heap-snapshot-object-graph-icon", WebInspector.HeapSnapshotClusterContentView.ObjectGraphIdentifier);

        if (this._supportsObjectGraph()) {
            this._instancesPathComponent.nextSibling = this._objectGraphPathComponent;
            this._objectGraphPathComponent.previousSibling = this._instancesPathComponent;
        }

        this._currentContentViewSetting = new WebInspector.Setting("heap-snapshot-cluster-current-view", WebInspector.HeapSnapshotClusterContentView.InstancesIdentifier);
    }

    // Static

    static iconStyleClassNameForClassName(className, internal)
    {
        if (internal)
            return "native";

        switch (className) {
        case "Object":
        case "Array":
        case "Map":
        case "Set":
        case "WeakMap":
        case "WeakSet":
        case "Promise":
        case "Error":
        case "Window":
        case "Map Iterator":
        case "Set Iterator":
        case "Math":
        case "JSON":
        case "GlobalObject":
            return "object";
        case "Function":
            return "function";
        case "RegExp":
            return "regex";
        case "Number":
            return "number";
        case "Boolean":
            return "boolean";
        case "String":
        case "string":
            return "string";
        case "Symbol":
        case "symbol":
            return "symbol";
        }

        if (className.endsWith("Prototype"))
            return "object";
        if (className.endsWith("Element") || className === "Node" || className === "Text")
            return "node";

        return "native";
    }

    // Public

    get heapSnapshot() { return this._heapSnapshot; }

    get instancesContentView()
    {
        if (!this._instancesContentView)
            this._instancesContentView = new WebInspector.HeapSnapshotInstancesContentView(this._heapSnapshot);
        return this._instancesContentView;
    }

    get objectGraphContentView()
    {
        if (!this._supportsObjectGraph())
            return null;

        if (!this._objectGraphContentView)
            this._objectGraphContentView = new WebInspector.HeapSnapshotObjectGraphContentView(this._heapSnapshot);
        return this._objectGraphContentView;
    }

    get selectionPathComponents()
    {
        let currentContentView = this._contentViewContainer.currentContentView;
        if (!currentContentView)
            return [];

        let components = [this._pathComponentForContentView(currentContentView)];
        return components.concat(currentContentView.selectionPathComponents);
    }

    shown()
    {
        super.shown();

        if (this._shownInitialContent)
            return;

        this._showContentViewForIdentifier(this._currentContentViewSetting.value);
    }

    closed()
    {
        super.closed();

        this._shownInitialContent = false;
    }

    saveToCookie(cookie)
    {
        cookie[WebInspector.HeapSnapshotClusterContentView.ContentViewIdentifierCookieKey] = this._currentContentViewSetting.value;
    }

    restoreFromCookie(cookie)
    {
        this._showContentViewForIdentifier(cookie[WebInspector.HeapSnapshotClusterContentView.ContentViewIdentifierCookieKey]);
    }

    showInstances()
    {
        this._shownInitialContent = true;
        return this._showContentViewForIdentifier(WebInspector.HeapSnapshotClusterContentView.InstancesIdentifier);
    }

    showObjectGraph()
    {
        this._shownInitialContent = true;
        return this._showContentViewForIdentifier(WebInspector.HeapSnapshotClusterContentView.ObjectGraphIdentifier);
    }

    // Private

    _supportsObjectGraph()
    {
        return this._heapSnapshot instanceof WebInspector.HeapSnapshotProxy;
    }

    _pathComponentForContentView(contentView)
    {
        console.assert(contentView);
        if (!contentView)
            return null;
        if (contentView === this._instancesContentView)
            return this._instancesPathComponent;
        if (contentView === this._objectGraphContentView)
            return this._objectGraphPathComponent;
        console.error("Unknown contentView.");
        return null;
    }

    _identifierForContentView(contentView)
    {
        console.assert(contentView);
        if (!contentView)
            return null;
        if (contentView === this._instancesContentView)
            return WebInspector.HeapSnapshotClusterContentView.InstancesIdentifier;
        if (contentView === this._objectGraphContentView)
            return WebInspector.HeapSnapshotClusterContentView.ObjectGraphIdentifier;
        console.error("Unknown contentView.");
        return null;
    }

    _showContentViewForIdentifier(identifier)
    {
        let contentViewToShow = null;

        switch (identifier) {
        case WebInspector.HeapSnapshotClusterContentView.InstancesIdentifier:
            contentViewToShow = this.instancesContentView;
            break;
        case WebInspector.HeapSnapshotClusterContentView.ObjectGraphIdentifier:
            contentViewToShow = this.objectGraphContentView;
            break;
        }

        if (!contentViewToShow)
            contentViewToShow = this.instancesContentView;

        console.assert(contentViewToShow);

        this._shownInitialContent = true;

        this._currentContentViewSetting.value = this._identifierForContentView(contentViewToShow);

        return this.contentViewContainer.showContentView(contentViewToShow);
    }

    _pathComponentSelected(event)
    {
        this._showContentViewForIdentifier(event.data.pathComponent.representedObject);
    }
};

WebInspector.HeapSnapshotClusterContentView.ContentViewIdentifierCookieKey = "heap-snapshot-cluster-content-view-identifier";

WebInspector.HeapSnapshotClusterContentView.InstancesIdentifier = "instances";
WebInspector.HeapSnapshotClusterContentView.ObjectGraphIdentifier = "object-graph";
