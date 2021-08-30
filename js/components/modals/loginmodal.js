class LoginModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="login-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium">
                    <div class="box has-text-centered">
                        <div class="width-is-two-thirds">
                            <h2 class="subtitle" id="login-title"></h2>
                            <p class="mb-5" id="login-text"></p>
                            <article class="message is-danger mb-5 is-hidden" id="login-incorrect-hint">
                                <div class="message-body"></div>
                            </article>
                            <form>
                                <div class="field">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-username-input" type="text" autocomplete="username" i18n-ph="username">
                                        <span class="icon is-small is-left">
                                            <i class="far fa-user"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-password-input" type="password" autocomplete="current-password" i18n-ph="password">
                                        <span class="icon is-small is-left">
                                            <i class="far fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field is-hidden">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-confirm-password-input" type="password" autocomplete="current-password" i18n-ph="password-confirm">
                                        <span class="icon is-small is-left">
                                            <i class="far fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <button class="button is-link mt-3" id="login-button" type="submit" i18n="open"></button>
                            </form>
                            <div class="buttons is-centered mt-3">
                                <button class="button is-text is-small" onclick="showForgotPasswordModal()" i18n="forgot-password-question"></button>
                                <button class="button is-text is-small is-hidden" id="remove-data-button" onclick="showRemoveDataModal(true)" i18n="remove-data-question"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("login-modal", LoginModal);
