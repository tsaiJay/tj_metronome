export function createProfileList({ store }) {
  const root = document.createElement("section");
  root.className = "panel profile-panel";
  root.innerHTML = `
    <h2>Practice Profiles</h2>
    <div class="profile-actions">
      <button data-id="new">Save Current</button>
      <button data-id="duplicate">Duplicate</button>
    </div>
    <ul class="profile-list" data-id="list"></ul>
  `;

  const nodes = {
    list: root.querySelector('[data-id="list"]'),
    saveNew: root.querySelector('[data-id="new"]'),
    duplicate: root.querySelector('[data-id="duplicate"]'),
  };

  nodes.saveNew.addEventListener("click", () => {
    const name = window.prompt("Profile 名稱", "New Profile");
    if (!name) return;
    store.saveProfile(name);
  });

  nodes.duplicate.addEventListener("click", () => {
    const id = store.getSnapshot().activeProfileId;
    if (!id) return;
    store.duplicateProfile(id);
  });

  function buildItem(profile, activeProfileId) {
    const item = document.createElement("li");
    item.className = `profile-item ${profile.id === activeProfileId ? "active" : ""}`;

    const title = document.createElement("button");
    title.type = "button";
    title.className = "profile-apply";
    title.textContent = profile.name;
    title.addEventListener("click", () => store.applyProfile(profile.id));
    item.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "profile-item-actions";
    const rename = document.createElement("button");
    rename.type = "button";
    rename.textContent = "Rename";
    rename.addEventListener("click", () => {
      const nextName = window.prompt("新名稱", profile.name);
      if (!nextName) return;
      store.renameProfile(profile.id, nextName);
    });
    actions.appendChild(rename);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.disabled = profile.builtIn;
    remove.addEventListener("click", () => {
      if (!window.confirm(`刪除 ${profile.name}?`)) return;
      store.deleteProfile(profile.id);
    });
    actions.appendChild(remove);
    item.appendChild(actions);
    return item;
  }

  return {
    element: root,
    render(snapshot) {
      nodes.list.innerHTML = "";
      snapshot.profiles.forEach((profile) => {
        nodes.list.appendChild(buildItem(profile, snapshot.activeProfileId));
      });
    },
  };
}
