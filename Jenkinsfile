pipeline {
    agent {
        label 'slave'
    }
    environment {
        HOME = '.'
        MONGO_URI = "mongodb://localhost:27017/hotelHopperDB"
    }
    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }
        stage('Run Tests') {
            steps {
                sh 'npm run test-jenkins'
                archiveArtifacts(artifacts: 'test-result/result.xml', allowEmptyArchive: true)
                junit 'test-result/result.xml'
            }
        }
    }
}