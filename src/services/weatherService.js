var WeatherService = class WeatherService {
    constructor(jmaProvider, openMeteoProvider, WeatherSnapshotClass) {
        this._jmaProvider = jmaProvider;
        this._openMeteoProvider = openMeteoProvider;
        this._WeatherSnapshot = WeatherSnapshotClass;
    }

    refresh(config, previousSnapshot, callback) {
        const snapshot = this._WeatherSnapshot.fromPrevious(previousSnapshot);
        let pending = 2;

        const finished = () => {
            pending -= 1;
            if (pending === 0)
                callback(snapshot);
        };

        this._jmaProvider.fetch(config.jma, (error, data) => {
            if (error) {
                snapshot.errors.push(`JMA: ${error.message}`);
            } else {
                snapshot.jma = data;
            }
            finished();
        });

        this._openMeteoProvider.fetch(config.openMeteo, (error, data) => {
            if (error) {
                snapshot.errors.push(`Open-Meteo: ${error.message}`);
            } else {
                snapshot.openMeteo = data;
            }
            finished();
        });
    }
};
