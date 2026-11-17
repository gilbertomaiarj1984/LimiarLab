import Toybox.ActivityRecording;
import Toybox.Sensor;

// A atividade de Força gravada em segundo plano (tempo total e FC; sem séries nativas,
// que o Connect IQ não permite gravar).
module Sessao {
    var sessao = null;

    function iniciar() {
        if (sessao != null) {
            return;
        }
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);
        sessao = ActivityRecording.createSession({
            :name => "Força",
            :sport => ActivityRecording.SPORT_TRAINING,
            :subSport => ActivityRecording.SUB_SPORT_STRENGTH_TRAINING
        });
        sessao.start();
    }

    // Uma volta por série e por descanso, para o tempo de cada um aparecer na Garmin Connect.
    function volta() {
        if (sessao != null && sessao.isRecording()) {
            sessao.addLap();
        }
    }

    function encerrar(salvar) {
        if (sessao == null) {
            return;
        }
        if (sessao.isRecording()) {
            sessao.stop();
        }
        if (salvar) {
            sessao.save();
        } else {
            sessao.discard();
        }
        sessao = null;
    }
}
