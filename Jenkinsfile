pipeline {
  agent {
    label 'slave'
  }
  stages {
    stage('Install Dependencies') {
      steps {
        nodejs('HotelHopper') {
          sh '''npm install
npm run test-jenkins'''
        }

      }
    }
    stage('Run Tests') {
      steps {
        archiveArtifacts(artifacts: 'test-result/result.xml', allowEmptyArchive: true)
        junit 'test-result/result.xml'
      }
    }
  }
  environment {
    HOME = '.'
    MONGO_URI = 'mongodb://localhost:27017/hotelHopperDB'
  }
}