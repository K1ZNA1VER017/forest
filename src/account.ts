/** Optional PHP/MySQL account adapter. No database credentials are ever bundled here. */
export class Account {
  private base = String(import.meta.env.VITE_API_BASE || "");
  private csrf = "";
  private email = "";
  private revision = 0;
  private ready = false;
  private busy = false;
  constructor(
    private show: (html: string) => void,
    private note: (s: string) => void,
    private getSave: () => unknown,
    private load: (s: unknown) => void,
  ) {
    if (this.base)
      this.request("session")
        .then((s) => {
          this.csrf = s.csrf;
          this.email = s.email || "";
        })
        .catch(() => {});
    setInterval(() => {
      if (this.ready && !this.busy)
        this.upload().catch((e) => {
          this.ready = false;
          this.note(String(e.message));
        });
    }, 30000);
  }
  private async request(action: string, data?: unknown) {
    const r = await fetch(this.base + "?action=" + action, {
      method: data === undefined ? "GET" : "POST",
      credentials: "include",
      headers:
        data === undefined
          ? {}
          : { "Content-Type": "application/json", "X-CSRF-Token": this.csrf },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const json = await r.json();
    if (!r.ok) throw Error(json.error || "Ошибка API");
    return json;
  }
  async open() {
    if (!this.base) {
      this.show(
        '<div class="eyebrow">ЛОКАЛЬНЫЙ РЕЖИМ</div><h2>Аккаунты ещё не подключены к этому адресу</h2><p>Играть и сохраняться можно в браузере. В проект включён PHP API для регистрации и одного облачного слота, но для его включения нужно развернуть PHP и MySQL и задать VITE_API_BASE при сборке.</p><p class="note">Текущий бесплатный Node.js сервис Render сам по себе не исполняет PHP и не содержит MySQL. Инструкция: backend/README.md. Не вводите пароли до настройки API и HTTPS.</p>',
      );
      return;
    }
    try {
      const session = await this.request("session");
      this.email = session.email || "";
      this.csrf = session.csrf;
      if (!this.email) {
        this.show(
          '<div class="eyebrow">АККАУНТ · ОДИН ПЕРСОНАЖ</div><h2>Память между устройствами</h2><input id="email" type="email" placeholder="Email" autocomplete="email"><input id="password" type="password" placeholder="Пароль, минимум 10 символов" autocomplete="current-password"><button id="login">Войти</button><button id="register">Зарегистрироваться</button><p class="note">Нет подтверждения email и восстановления пароля: это тестовая авторизация. Не используйте пароль от других сервисов.</p>',
        );
        for (const action of ["login", "register"])
          document.getElementById(action)!.onclick = async () => {
            try {
              const s = await this.request(action, {
                email: (document.getElementById("email") as HTMLInputElement)
                  .value,
                password: (
                  document.getElementById("password") as HTMLInputElement
                ).value,
              });
              this.csrf = s.csrf;
              this.email = s.email;
              await this.open();
            } catch (e) {
              this.note((e as Error).message);
            }
          };
      } else {
        const cloud = await this.request("save");
        this.revision = cloud.revision;
        this.show(
          `<div class="eyebrow">ОБЛАЧНЫЙ СЛОТ · ВЕРСИЯ ${cloud.revision}</div><h2>Ваш путь сохранится</h2><p id="accountemail"></p><p>${cloud.save ? "На сервере есть персонаж. Выберите загрузку или сознательно замените его текущим локальным." : "На сервере ещё нет персонажа. Сохраните текущий локальный слот."}</p><button id="cloudload" ${cloud.save ? "" : "disabled"}>Загрузить облачный слот</button><button id="cloudupload">Сохранить локальный и включить автосейв</button><button id="logout">Выйти</button><p class="note">Автосохранение каждые 30 секунд включается после явного выбора. Конфликт версий останавливает запись, чтобы не затереть другой сеанс.</p>`,
        );
        document.getElementById("accountemail")!.textContent = this.email;
        document.getElementById("cloudload")!.onclick = () => {
          if (cloud.save && confirm("Заменить локальный слот облачным?"))
            this.load(cloud.save);
        };
        document.getElementById("cloudupload")!.onclick = async () => {
          if (cloud.save && !confirm("Заменить облачный слот локальным?"))
            return;
          try {
            await this.upload();
            this.ready = true;
            this.note("Облачное автосохранение включено");
          } catch (e) {
            this.note((e as Error).message);
          }
        };
        document.getElementById("logout")!.onclick = async () => {
          this.ready = false;
          await this.request("logout", {});
          this.email = "";
          await this.open();
        };
      }
    } catch (e) {
      this.note((e as Error).message);
    }
  }
  private async upload() {
    if (this.busy) return;
    this.busy = true;
    try {
      const s = await this.request("save", {
        revision: this.revision,
        save: this.getSave(),
      });
      this.revision = s.revision;
    } finally {
      this.busy = false;
    }
  }
}
