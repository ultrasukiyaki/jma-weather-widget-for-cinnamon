const ByteArray = imports.byteArray;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;

var HttpClient = class HttpClient {
    constructor(userAgent, timeoutSeconds = 20) {
        this._destroyed = false;
        this._session = new Soup.Session({
            user_agent: userAgent
        });
        this._session.timeout = timeoutSeconds;
    }

    getJson(url, callback) {
        if (this._destroyed) {
            callback(new Error("HTTP client is closed"), null);
            return;
        }

        let message;

        try {
            message = Soup.Message.new("GET", url);
        } catch (error) {
            callback(error, null);
            return;
        }

        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                if (this._destroyed)
                    return;

                try {
                    const bytes = session.send_and_read_finish(result);
                    const status = message.get_status();

                    if (status < 200 || status >= 300)
                        throw new Error(`HTTP ${status}`);

                    const text = ByteArray.toString(bytes.get_data());
                    callback(null, JSON.parse(text));
                } catch (error) {
                    callback(error, null);
                }
            }
        );
    }

    destroy() {
        this._destroyed = true;

        if (this._session) {
            this._session.abort();
            this._session = null;
        }
    }
};
